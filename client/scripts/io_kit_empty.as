package {
    import flash.display.BitmapData;

    /** Inferno-only art built into the game (so it never depends on a file being on the server). */
    [Embed(source="/_assets/io_kit_empty.png")]
    public dynamic class io_kit_empty extends BitmapData {

        public function io_kit_empty(param1:int = 140, param2:int = 90) {
            super(param1, param2);
        }
    }
}
