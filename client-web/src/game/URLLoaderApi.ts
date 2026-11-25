import * as as3 from "as3";
import { ASObject, int } from "as3";
import { Event, HTTPStatusEvent, IOErrorEvent, SecurityErrorEvent } from "flash/events";
import { URLLoader, URLRequest, URLRequestHeader, URLRequestMethod, URLVariables } from "flash/net";
import { getTimer, setTimeout } from "flash/utils";
import { GLOBAL, IoBugReport, IoServerHold, IoWin, LOGGER, LOGIN, print } from "@game";

export class URLLoaderApi extends ASObject {
    static {
        as3.fields(this, { _status: 0, _url: null, _req: null, _onComplete: null, _onError: null, _baseUrl: null, _t0: 0, _ioPairs: null, _ioRetried: false });
    }

    public static _data: string = "";

    // ---- Inferno-only (QoL #446, #447): what the windows say about the server
    /** The reference of the last failure the server reported itself, what it said, and when (getTimer). */
    private static _ioRef: string = "";

    private static _ioRefSaid: string = "";

    private static _ioRefAt: number = 0;

    /** The ref of the answer being handled right now (its callback is running), or "". */
    private static _ioInAnswer: string = "";

    /** Requests in a row that got no answer at all (or the proxy's 502-504, 520-530); 0 again at the first answer. */
    private static _ioFailsInRow: int = 0;

    /** QoL #447: two requests in a row got no answer: the server can't be reached (it is being tried again). */
    public static get ioUnreachable(): boolean {
        return URLLoaderApi._ioFailsInRow >= 2;
    }

    /**
     * QoL #446: the server's reference for a message that is showing its failure: the answer being handled now, or
     * the last failure (in the last 5 s) when the message says what the server said. "" otherwise.
     */
    public static ioRefFor(text: string): string {
        if (!GLOBAL.INFERNO_ONLY) {
            return "";
        }
        if (URLLoaderApi._ioInAnswer) {
            return URLLoaderApi._ioInAnswer;
        }
        let said: string = URLLoaderApi._ioRefSaid.substr(0, 40);
        if (URLLoaderApi._ioRef && getTimer() - URLLoaderApi._ioRefAt < 5000 && said != "" && String(text || "").indexOf(said) >= 0) {
            return URLLoaderApi._ioRef;
        }
        return "";
    }

    /** Notes an answer's ref (a failure the server reported itself); returns it ("" without one). */
    private static ioNoteRef(answer: any): string {
        if (!answer || typeof answer != "object" || !answer.ref) {
            return "";
        }
        URLLoaderApi._ioRef = String(answer.ref);
        URLLoaderApi._ioRefSaid = String(answer.error || answer.message || "");
        URLLoaderApi._ioRefAt = getTimer();
        return URLLoaderApi._ioRef;
    }

    /** Runs a callback with the answer's ref marked as the one being handled (GLOBAL.Message shows it then). */
    private static ioWithRef(ref: string, call: Function): void {
        let before: string = URLLoaderApi._ioInAnswer;
        URLLoaderApi._ioInAnswer = ref;
        try {
            call();
        } finally {
            URLLoaderApi._ioInAnswer = before;
        }
    }

    // ---- Inferno-only (QoL #533): the server's limits
    /**
     * The requests that only read (a list, the map, a state): asked again once by themselves when a limit refused
     * them (ioRetryLimited). Anything that changes something is never sent twice: its caller hears the refusal.
     */
    private static readonly IO_READ_ONLY: RegExp = /\/(worldmapv2\/(getarea|ioreach|mapdata)|worldmapv3\/getcells|leaderboards\/game|attacklogs\/game|pets\/list|trophies\/of|replays\/get|casino\/(state|history)|alliance\/searchalliances)$/;

    /** The longest wait a read is asked again after (a longer one: its caller hears the refusal at once). */
    public static readonly IO_RETRY_MAX_S: int = 20;

    /**
     * QoL #533: how many seconds a limit's refusal asks to wait (its `wait`, which every limiter's answer carries
     * with a Retry-After header), or 0 for an answer that isn't one.
     */
    public static ioWait(answer: any): int {
        if (!answer || typeof answer != "object" || !answer.error) {
            return 0;
        }
        let w: number = Number(answer.wait);
        return w > 0 ? Math.ceil(w) | 0 : 0;
    }

    /**
     * QoL #533, the one place a limit's refusal is handled: a read refused by a limit (status 429, or a limiter's
     * answer with `limited: true`; both carry `wait`) is sent again once, after the wait (up to IO_RETRY_MAX_S), and
     * its caller hears only the second answer.
     * True when it is being sent again (nothing else is to be done with this answer).
     */
    private ioRetryLimited(answer: any): boolean {
        if (this._ioRetried || !this._baseUrl) {
            return false;
        }
        // (a limiter's answer says so: `limited`, or the status 429; another answer's `wait` is its own business)
        let limited: boolean = this._status == 429 || Boolean(answer && typeof answer == "object" && answer.limited === true);
        if (!limited) {
            return false;
        }
        // (a refusal that doesn't say how long to wait (an older server) goes to its caller as before)
        let wait: int = URLLoaderApi.ioWait(answer);
        if (wait <= 0 || wait > URLLoaderApi.IO_RETRY_MAX_S || !URLLoaderApi.IO_READ_ONLY.test(this.ioPath())) {
            return false;
        }
        this._ioRetried = true;
        let url: string = this._baseUrl;
        let pairs: any[] = this._ioPairs;
        let done: Function = this._onComplete;
        let fail: Function = this._onError;
        LOGGER.Log("log", "Limited on " + this.ioPath() + ": asked again in " + wait + " s");
        setTimeout((): void => {
            this.load(url, pairs, done, fail);
        }, wait * 1000 + 250);
        return true;
    }

    /** QoL #447: an answer came (`answered`), or none did; counts the ones in a row that didn't. */
    private static ioCountAnswer(answered: boolean): void {
        if (answered) {
            URLLoaderApi._ioFailsInRow = 0;
        } else {
            URLLoaderApi._ioFailsInRow = (URLLoaderApi._ioFailsInRow + 1) | 0;
        }
    }
    private _status: int;
    private _url: string;
    private _req: URLLoader;
    private _onComplete: Function;
    private _onError: Function;
    private _baseUrl: string;
    /** When the request was sent (getTimer), for how long it took. */
    private _t0: int;
    /** (QoL #533) what was sent, for asking again once after a limit's wait */
    private _ioPairs: any[];
    private _ioRetried: boolean;

    public $ctor(): void {
        super.$ctor();
    }

    /*
     * This function was created by the Refitted team to send data to the server in JSON format.
     * It provides a more expressive, structured way for parsing and handling data on the server.
     *
     * @param {String} url - the URL to send data to.
     * @param {Object} data - the data to send in JSON format.
     * @param {String} method - the HTTP method to use (default is POST).
     * @param {Function} onComplete - a callback function to be called on successful completion of the request.
     * @return {void}
     */
    public invokeApiRequest(url: string, data: any, method: string = "POST", onComplete: Function = null): void {
        let loader: URLLoader = null;
        let errMessage: string = null;
        try {
            let request: URLRequest = new URLRequest(url);
            loader = new URLLoader();
            errMessage = "";

            request.method = method;
            request.contentType = "application/json";
            request.requestHeaders.push(new URLRequestHeader("Authorization", "Bearer " + LOGIN.token));

            if (data == null) {
                data = {};
            }
            if (method != URLRequestMethod.GET) {
                request.data = JSON.stringify(data);
            }

            // Send the request
            loader.load(request);

            // On success, decode JSON and invoke callback
            loader.addEventListener(Event.COMPLETE, (e: Event): void => {
                if (GLOBAL.INFERNO_ONLY) {
                    URLLoaderApi.ioCountAnswer(true);
                }
                let response: any = JSON.parse(as3.str(loader.data));

                if (onComplete != null) {
                    onComplete(response);
                }
            });

            loader.addEventListener(IOErrorEvent.IO_ERROR, (event: IOErrorEvent): void => {
                errMessage = "IOError error event occurred while making the request";
                if (GLOBAL.INFERNO_ONLY) {
                    // (QoL #446, #447: the server's ref, when its answer has one; an answer at all, or none)
                    let said: any = null;
                    try {
                        said = loader.data ? JSON.parse(as3.str(loader.data)) : null;
                    } catch (err) {
                        said = null;
                    }
                    URLLoaderApi.ioCountAnswer(said != null);
                    errMessage = IoWin.withRef(errMessage, URLLoaderApi.ioNoteRef(said));
                }
                GLOBAL.ErrorMessage(errMessage, GLOBAL.ERROR_ORANGE_BOX_ONLY);
            });
        } catch (error) {
            errMessage = "Error occurred while making the request: " + error.message;
            GLOBAL.ErrorMessage(errMessage, GLOBAL.ERROR_ORANGE_BOX_ONLY);
        }
    }

    /*
     * This is the original networking function that was used to load data from the server by Kixeye,
     * with some additons such as Bearer tokens in the header for authentication added by the Refitted team.
     *
     * The majority of the client uses this to access and load data from the server.
     * It uses key-value pairs to send data in application/x-www-form-urlencoded format
     * e.g. keyValuePairs: [["key1", "value1"], ["key2", "value2"]].
     *
     * @param {String} baseUrl - the URL to load data from.
     * @param {Array} keyValuePairs - an array of key-value pairs to send in the request.
     * @param {Function} onComplete - a callback function to be called on successful completion of the request.
     * @param {Function} onFail - a callback function to be called on failure of the request.
     * @return {void}
     */
    public load(baseUrl: string, keyValuePairs: any[] = null, onComplete: Function = null, onFail: Function = null): void {
        let urlBuilder: URLRequest = null;
        let urlVariables: URLVariables = null;
        let authHeader: URLRequestHeader = null;
        let currentIndex: int = 0;
        let currentPair: any[] = null;
        let token: any = LOGIN.token;
        this._onComplete = onComplete;
        this._onError = onFail;
        this._baseUrl = baseUrl;
        this._url = baseUrl;
        this._ioPairs = keyValuePairs;
        urlBuilder = new URLRequest(baseUrl);
        urlVariables = new URLVariables();
        if (keyValuePairs != null && keyValuePairs.length > 0) {
            currentIndex = 0;
            while (currentIndex < keyValuePairs.length) {
                currentPair = as3.cast(keyValuePairs[currentIndex], Array);
                urlVariables[currentPair[0]] = currentPair[1];
                currentIndex++;
            }
        }
        if (token) {
            authHeader = new URLRequestHeader("Authorization", "Bearer " + token);
            urlBuilder.requestHeaders.push(authHeader);
        }
        urlBuilder.data = urlVariables;
        urlBuilder.method = URLRequestMethod.POST;
        this._t0 = getTimer();
        this._req = new URLLoader(urlBuilder);
        this._req.addEventListener(Event.COMPLETE, as3.bind(this, this.fireComplete));
        this._req.addEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.loadError));
        this._req.addEventListener(HTTPStatusEvent.HTTP_STATUS, as3.bind(this, this.setStatus));
        this._req.addEventListener(SecurityErrorEvent.SECURITY_ERROR, (event: SecurityErrorEvent): any => {
            GLOBAL.initError = "Failed to connect to the server.";
            GLOBAL.eventDispatcher.dispatchEvent(new Event("initError"));
            return;
        });
    }

    /** The status only: the line about a failure is written once the answer is in (ioFailure), with what the server said. */
    private setStatus(param1: HTTPStatusEvent): void {
        this._status = param1.status;
    }

    /**
     * Inferno-only: one line for a request that failed, with what the bug reports need: the status,
     * the request, what the server said, how long it took, and the server's reference for a failure it
     * reported itself. Answers that are not failures are written as "log", not "err", so they are not
     * reported: 4xx (a login that expired, a name already taken, ...), a newer client published (the
     * init answer's versionMismatch) and 502/503/504 (the server or its proxy restarting in a deploy); since 16
     * October Cloudflare's 520-530 too (its own "the server isn't there": bug reports #93, #94).
     * No status at all: no answer came (the player's connection dropped, or the server was down). That
     * is "log" too since 1 October (bug reports #50, #52, #55, #59: phones in a pocket, a tab put to sleep):
     * the game already tries again (saves and polls go again, /init three times) and five saves in a row
     * that fail still stop the game with "Base.Save HTTP", which is reported.
     */
    private ioFailure(errorObj: any): void {
        let ms: int = (getTimer() - this._t0) | 0;
        let said: string = "";
        let ref: string = "";
        let expected: boolean = false;
        let line: string = null;
        if (errorObj) {
            said = String(errorObj.error || errorObj.message || "");
            ref = errorObj.ref ? " [ref " + errorObj.ref + "]" : "";
        }
        IoBugReport.Request(this.ioPath(), this._status, ms);
        if (!this._status) {
            line = "No answer from the server on " + this.ioPath() + " after " + ms + " ms (connection dropped, or the server was down)";
        } else {
            line = "HTTP " + this._status + " on " + this.ioPath() + (said ? ": " + said.substr(0, 200) : "") + " (" + ms + " ms)" + ref;
        }
        expected = !this._status || (this._status >= 400 && this._status < 500) || IoServerHold.proxyDown(this._status) || Boolean(errorObj && errorObj.versionMismatch);
        LOGGER.Log(expected ? "log" : "err", line);
    }

    /** The request's path without the server or query (bug reports say which request failed). */
    private ioPath(): string {
        return as3.str(String(this._url || "").replace(/^[a-z]+:\/\/[^\/]+/i, "").split("?")[0]);
    }

    /*
     * Handles IO error events from URLLoader requests.
     *
     * This function is triggered when the server responds with a non-2xx HTTP status code
     * (such as 400, 404, 500), or when a network error occurs. In ActionScript 3, even when
     * an HTTP error occurs, the server's response body (such as a JSON error message) is still
     * available in the URLLoader's `data` property.
     *
     * The function attempts to decode the response body as JSON. If the server sent a JSON error
     * object (e.g., `{ "error": "Invalid API version..." }`), it will be parsed and passed to
     * the success callback (`_onComplete`). This allows the main application code to handle
     * server-sent error messages in a unified way, regardless of HTTP status.
     *
     * If the response is not valid JSON or no data is present, the error callback (`_onError`)
     * is called instead.
     *
     * This approach ensures that server error messages are not lost, and can be displayed to
     * the user even when the HTTP status code indicates an error.
     *
     * @param {IOErrorEvent} param1 - The IO error event triggered by the URLLoader.
     */
    private loadError(param1: IOErrorEvent): void {
        let errorObj: any = null;
        if (this._req && this._req.data) {
            try {
                errorObj = JSON.parse(as3.str(this._req.data));
            } catch (e) {
            }
        }
        // Inferno-only: during play, the server no longer accepts this login ("Could not authenticate":
        // replaced by a login elsewhere, expired, banned). Other 401s (the Discord age check) keep their
        // normal handling. Answered once for the whole game (GLOBAL.ioSessionEnded), not per request.
        if (GLOBAL.INFERNO_ONLY && this._status == 401 && GLOBAL._loadmode && errorObj && String(errorObj.error).indexOf("Could not authenticate") == 0) {
            GLOBAL.ioSessionEnded(String(errorObj.error));
            return;
        }
        this.ioFailure(errorObj);
        if (GLOBAL.INFERNO_ONLY) {
            // (QoL #447: no answer, or the proxy's while the server restarts; QoL #446: the failure's ref, shown by a
            // message the callback puts up)
            URLLoaderApi.ioCountAnswer(this._status > 0 && !IoServerHold.proxyDown(this._status));
            // (QoL #533: a read a limit refused goes again after its wait)
            if (this.ioRetryLimited(errorObj)) {
                return;
            }
            let ref: string = URLLoaderApi.ioNoteRef(errorObj);
            if (errorObj && this._onComplete != null) {
                let done: Function = this._onComplete;
                URLLoaderApi.ioWithRef(ref, (): void => {
                    done(errorObj);
                });
            } else if (this._onError != null) {
                this._onError(param1);
            }
            return;
        }
        if (errorObj && this._onComplete != null) {
            this._onComplete(errorObj);
        } else if (this._onError != null) {
            this._onError(param1);
        }
    }

    public Clear(): void {
        this._req.removeEventListener(Event.COMPLETE, as3.bind(this, this.fireComplete));
        this._req.removeEventListener(IOErrorEvent.IO_ERROR, as3.bind(this, this.loadError));
        this._req.removeEventListener(HTTPStatusEvent.HTTP_STATUS, as3.bind(this, this.setStatus));
        this._req = null;
    }

    private fireComplete(param1: Event): void {
        if (this._status < 400) {
            IoBugReport.Request(this.ioPath(), this._status || 200, (getTimer() - this._t0) | 0);
        }
        if (this._onComplete === null) {
            return;
        }
        let decodedReqData: any = null;
        try {
            decodedReqData = JSON.parse(as3.str(this._req.data));
        } catch (e) {
            // Not JSON (a proxy's error page, a cut-off answer): the caller's failure path runs, so
            // nothing is left waiting for an answer that never comes.
            IoBugReport.Request(this.ioPath(), this._status, (getTimer() - this._t0) | 0);
            if (GLOBAL.INFERNO_ONLY) {
                // (QoL #447: a proxy's error page while the server restarts is no answer from the game's server)
                URLLoaderApi.ioCountAnswer(this._status > 0 && !IoServerHold.proxyDown(this._status));
            }
            LOGGER.Log("err", "URLLoaderApi: the answer is not JSON " + this.ioPath() + (this._status ? " (HTTP " + this._status + ")" : "") + ": " + String(this._req.data || "(empty)").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").substr(0, 120));
            if (this._onError != null) {
                this._onError(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, "invalid JSON"));
            }
            return;
        }
        if (this._status >= 400) {
            this.ioFailure(decodedReqData);
        }
        if (GLOBAL.INFERNO_ONLY) {
            URLLoaderApi.ioCountAnswer(true);
            // (QoL #533: a read a limit refused (some limiters answer 200, with `wait`) goes again after its wait)
            if (this.ioRetryLimited(decodedReqData)) {
                return;
            }
            // (QoL #446: a failure the server reported in a 200 answer ({ error, errorDetails, ref }) carries its ref
            // too: a message its callback shows says it)
            let ref: string = URLLoaderApi.ioNoteRef(decodedReqData);
            if (ref && decodedReqData && Boolean(this._onComplete)) {
                let done: Function = this._onComplete;
                URLLoaderApi.ioWithRef(ref, (): void => {
                    done(decodedReqData);
                });
                return;
            }
        }
        if (Boolean(this._onComplete)) {
            if (decodedReqData) {
                this._onComplete(decodedReqData);
            } else {
                print("no jdata?!" + decodedReqData, true);
            }
        }
    }
}
