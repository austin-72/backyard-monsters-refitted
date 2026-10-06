import { ASObject } from "as3";

/**
 * The build stamp of this client (inferno-only version control).
 *
 * stamp-build.cmd rewrites this file with the current date and time before every release build
 * (VS Code task "BYMR - Release"), so there is nothing to bump by hand. Do not edit it.
 *
 * The stamp travels two ways:
 *  - the client sends it with /init, and the server refuses a client older than the one it serves;
 *  - the server finds it inside the published SWF by looking for the MARKER text, which is how it
 *    knows what "the one it serves" is. Keep the MARKER format exactly: IOBUILD:<digits>:
 */
export class IOBuild extends ASObject {
    public static readonly MARKER: string = "IOBUILD:202609210000:";

    public static get stamp(): number {
        return Number(IOBuild.MARKER.split(":")[1]);
    }
}
