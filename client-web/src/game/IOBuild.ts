import { ASObject } from "as3";

/**
 * The build stamp of this client (inferno-only version control).
 *
 * npm run stamp (stamp-build.cmd / stamp-build.sh, VS Code task "BYMR - Release") rewrites this file with the
 * current date and time before every release, so there is nothing to bump by hand. Do not edit it.
 *
 * The stamp travels two ways:
 *  - the client sends it with /init, and the server refuses a client older than the one it serves;
 *  - the build writes it into version.json (tools/build.ts finds it here by the MARKER text), which is how the
 *    server knows what "the one it serves" is. Keep the MARKER format exactly: IOBUILD:<digits>:
 */
export class IOBuild extends ASObject {
    public static readonly MARKER: string = "IOBUILD:202611270116:";

    public static get stamp(): number {
        return Number(IOBuild.MARKER.split(":")[1]);
    }
}
