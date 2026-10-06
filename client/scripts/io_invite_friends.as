package {
    import flash.display.BitmapData;

    /** Inferno-only art built into the game (so it never depends on a file being on the server). */
    [Embed(source="/_assets/io_invite_friends.png")]
    public dynamic class io_invite_friends extends BitmapData {

        public function io_invite_friends(param1:int = 120, param2:int = 120) {
            super(param1, param2);
        }
    }
}
