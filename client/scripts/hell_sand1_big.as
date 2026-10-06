package {
    import flash.display.BitmapData;

    // one seamless 1000x500 bone ground: used whole, so the bones never repeat inside a yard
    [Embed(source="/_assets/hellyard/hell_sand1_big.jpg")]
    public dynamic class hell_sand1_big extends BitmapData {

        public function hell_sand1_big(param1:int = 1000, param2:int = 500) {
            super(param1, param2);
        }
    }
}
