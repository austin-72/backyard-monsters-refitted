package {
    import com.monsters.casino.CasinoWindow;
    import flash.events.Event;
    import flash.geom.Rectangle;

    /**
     * Inferno-only: the Brimstone Pit (building 141), Moloch's gambling den. Its info panel opens the
     * casino (com/monsters/casino/CasinoWindow); every game is played on the server (server/src/services/
     * casino), this only shows it. Main yard only (not in the outpost build lists).
     *
     * Art: server/public/assets/buildings/ibrimstonepit (art/brimstonepit makes it). Two animation layers:
     * anim (the lava trough, the door glow, the skull's eyes, 60 frames) and anim2 (the dice bouncing in
     * their bubble, 80 frames), both played at one frame every 3 game frames.
     */
    public class BRIMSTONEPIT extends BFOUNDATION {

        public static const ID:int = 141;

        /** The label of the info panel's button that opens the casino. */
        public static const OPEN_BUTTON:String = "btn_openbrimstonepit";

        private var _frameNumber:int = 0;

        public function BRIMSTONEPIT() {
            super();
            _type = ID;
            _footprint = [new Rectangle(0, 0, 90, 90)];
            _gridCost = [[new Rectangle(0, 0, 90, 90), 10], [new Rectangle(10, 10, 70, 70), 200]];
            SetProps();
        }

        override public function TickFast(param1:Event = null):void {
            super.TickFast(param1);
            if (GLOBAL._render && _countdownBuild.Get() == 0 && this._frameNumber % 3 == 0) {
                AnimFrame(true);
            }
            ++this._frameNumber;
        }

        override public function Description():void {
            super.Description();
            _buildingTitle = "Brimstone Pit";
            _buildingDescription = "Moloch's own gambling den. Wager Shiny against the house. The house always wins... usually.";
            _specialDescription = "Level " + _lvl.Get() + ": " + CasinoWindow.gamesAtLevel(_lvl.Get());
        }
    }
}
