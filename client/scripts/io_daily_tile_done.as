package {
    import flash.display.BitmapData;

    /** Inferno-only art built into the game (so it never depends on a file being on the server). */
    [Embed(source="/_assets/io_daily_tile_done.png")]
    public dynamic class io_daily_tile_done extends BitmapData {

        public function io_daily_tile_done(param1:int = 80, param2:int = 104) {
            super(param1, param2);
        }
    }
}
