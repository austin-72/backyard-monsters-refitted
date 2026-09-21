package {
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
    public class IOBuild {
        public static const MARKER:String = "IOBUILD:202609210000:";

        public static function get stamp():Number {
            return Number(MARKER.split(":")[1]);
        }
    }
}
