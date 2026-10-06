package {

    import flash.events.Event;
    import flash.events.HTTPStatusEvent;
    import flash.events.IOErrorEvent;
    import flash.events.SecurityErrorEvent;
    import flash.net.URLLoader;
    import flash.net.URLRequest;
    import flash.net.URLRequestHeader;
    import flash.net.URLRequestMethod;
    import flash.net.URLVariables;
    import flash.utils.getTimer;
    import com.monsters.debug.IoBugReport;

    public class URLLoaderApi {

        public static var _data:String = "";

        private var _status:int;

        private var _url:String;

        private var _req:URLLoader;

        private var _onComplete:Function;

        private var _onError:Function;

        private var _baseUrl:String;

        /** When the request was sent (getTimer), for how long it took. */
        private var _t0:int = 0;

        public function URLLoaderApi() {
            super();
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
        public function invokeApiRequest(url:String, data:Object, method:String = "POST", onComplete:Function = null):void {
            try {
                var request:URLRequest = new URLRequest(url);
                var loader:URLLoader = new URLLoader();
                var errMessage:String = "";

                request.method = method;
                request.contentType = "application/json";
                request.requestHeaders.push(new URLRequestHeader("Authorization", "Bearer " + LOGIN.token));

                if (data == null)
                    data = {};
                if (method != URLRequestMethod.GET)
                    request.data = JSON.stringify(data);

                // Send the request
                loader.load(request);

                // On success, decode JSON and invoke callback
                loader.addEventListener(Event.COMPLETE, function(e:Event):void {
                        var response:Object = JSON.parse(loader.data);

                        if (onComplete != null)
                            onComplete(response);
                    });

                loader.addEventListener(IOErrorEvent.IO_ERROR, function(event:IOErrorEvent):void {
                        errMessage = "IOError error event occurred while making the request";
                        GLOBAL.ErrorMessage(errMessage, GLOBAL.ERROR_ORANGE_BOX_ONLY);
                    });

            }
            catch (error:Error) {
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
        public function load(baseUrl:String, keyValuePairs:Array = null, onComplete:Function = null, onFail:Function = null):void {
            var urlBuilder:URLRequest;
            var urlVariables:URLVariables;
            var authHeader:URLRequestHeader;
            var currentIndex:int = 0;
            var currentPair:Array = null;
            var token:* = LOGIN.token;
            this._onComplete = onComplete;
            this._onError = onFail;
            this._baseUrl = baseUrl;
            this._url = baseUrl;
            urlBuilder = new URLRequest(baseUrl);
            urlVariables = new URLVariables();
            if (keyValuePairs != null && keyValuePairs.length > 0) {
                currentIndex = 0;
                while (currentIndex < keyValuePairs.length) {
                    currentPair = keyValuePairs[currentIndex];
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
            this._req.addEventListener(Event.COMPLETE, this.fireComplete);
            this._req.addEventListener(IOErrorEvent.IO_ERROR, this.loadError);
            this._req.addEventListener(HTTPStatusEvent.HTTP_STATUS, this.setStatus);
            this._req.addEventListener(SecurityErrorEvent.SECURITY_ERROR, function(event:SecurityErrorEvent):* {
                    GLOBAL.initError = "Failed to connect to the server.";
                    GLOBAL.eventDispatcher.dispatchEvent(new Event("initError"));
                    return;
                });
        }

        /** The status only: the line about a failure is written once the answer is in (ioFailure), with what the server said. */
        private function setStatus(param1:HTTPStatusEvent):void {
            this._status = param1.status;
        }

        /**
         * Inferno-only: one line for a request that failed, with what the bug reports need: the status,
         * the request, what the server said, how long it took, and the server's reference for a failure it
         * reported itself. Answers that are not failures are written as "log", not "err", so they are not
         * reported: 4xx (a login that expired, a name already taken, ...), a newer client published (the
         * init answer's versionMismatch) and 502/503/504 (the server or its proxy restarting in a deploy).
         * No status at all: no answer came (the player's connection dropped, or the server was down). That
         * is "log" too since 1 October (bug reports #50, #52, #55, #59: phones in a pocket, a tab put to sleep):
         * the game already tries again (saves and polls go again, /init three times) and five saves in a row
         * that fail still stop the game with "Base.Save HTTP", which is reported.
         */
        private function ioFailure(errorObj:Object):void {
            var ms:int = getTimer() - this._t0;
            var said:String = "";
            var ref:String = "";
            var expected:Boolean = false;
            var line:String = null;
            if (errorObj) {
                said = String(errorObj.error || errorObj.message || "");
                ref = errorObj.ref ? " [ref " + errorObj.ref + "]" : "";
            }
            IoBugReport.Request(this.ioPath(), this._status, ms);
            if (!this._status) {
                line = "No answer from the server on " + this.ioPath() + " after " + ms + " ms (connection dropped, or the server was down)";
            }
            else {
                line = "HTTP " + this._status + " on " + this.ioPath() + (said ? ": " + said.substr(0, 200) : "") + " (" + ms + " ms)" + ref;
            }
            expected = !this._status || (this._status >= 400 && this._status < 500) || (this._status >= 502 && this._status <= 504) || Boolean(errorObj && errorObj.versionMismatch);
            LOGGER.Log(expected ? "log" : "err", line);
        }

        /** The request's path without the server or query (bug reports say which request failed). */
        private function ioPath():String {
            return String(this._url || "").replace(/^[a-z]+:\/\/[^\/]+/i, "").split("?")[0];
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
        private function loadError(param1:IOErrorEvent):void {
            var errorObj:Object = null;
            if (this._req && this._req.data) {
                try {
                    errorObj = JSON.parse(this._req.data);
                }
                catch (e:Error) {
                }
            }
            // Inferno-only: during play, the server no longer accepts this login ("Could not authenticate":
            // replaced by a login elsewhere, expired, banned). Other 401s (the Discord age check) keep their
            // normal handling. Answered once for the whole game (GLOBAL.ioSessionEnded), not per request.
            if (GLOBAL.INFERNO_ONLY && this._status == 401 && GLOBAL._loadmode && errorObj && String(errorObj.error).indexOf("Could not authenticate") == 0) {
                GLOBAL.ioSessionEnded();
                return;
            }
            this.ioFailure(errorObj);
            if (errorObj && this._onComplete != null) {
                this._onComplete(errorObj);
            }
            else if (this._onError != null) {
                this._onError(param1);
            }
        }

        public function Clear():void {
            this._req.removeEventListener(Event.COMPLETE, this.fireComplete);
            this._req.removeEventListener(IOErrorEvent.IO_ERROR, this.loadError);
            this._req.removeEventListener(HTTPStatusEvent.HTTP_STATUS, this.setStatus);
            this._req = null;
        }

        private function fireComplete(param1:Event):void {
            if (this._status < 400) {
                IoBugReport.Request(this.ioPath(), this._status || 200, getTimer() - this._t0);
            }
            if (this._onComplete === null) {
                return;
            }
            var decodedReqData:Object = null;
            try {
                decodedReqData = JSON.parse(this._req.data);
            }
            catch (e:Error) {
                // Not JSON (a proxy's error page, a cut-off answer): the caller's failure path runs, so
                // nothing is left waiting for an answer that never comes.
                IoBugReport.Request(this.ioPath(), this._status, getTimer() - this._t0);
                LOGGER.Log("err", "URLLoaderApi: the answer is not JSON " + this.ioPath() + (this._status ? " (HTTP " + this._status + ")" : "")
                    + ": " + String(this._req.data || "(empty)").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").substr(0, 120));
                if (this._onError != null) {
                    this._onError(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, "invalid JSON"));
                }
                return;
            }
            if (this._status >= 400) {
                this.ioFailure(decodedReqData); // an error answer delivered as complete (some players do)
            }
            if (Boolean(this._onComplete)) {
                if (decodedReqData) {
                    this._onComplete(decodedReqData);
                }
                else {
                    print("no jdata?!" + decodedReqData, true);
                }
            }
        }
    }
}
