package com.monsters.pathing {

    public class PATHINGfloodobject {

        public var pending:int = 0;

        /**
         * How far each cell of the 260 x 260 grid is from the target (index x * 260 + y), -1 where the flood
         * has not been yet. (It was an Object of a PATHINGobject per cell, keyed x * 1000 + y: tens of
         * thousands of objects per target, and every step of the flood listed all their keys again; fps pass,
         * 4 October.)
         */
        public var depth:Vector.<int>;

        /** The flood's edge (cell indexes), and the next one being built (swapped each round). */
        public var edge:Vector.<int>;

        public var edgeNext:Vector.<int>;

        public var minDepth:int = 9999999;

        public var startpoints:Object;

        public var ignoreWalls:Boolean = false;

        public function PATHINGfloodobject() {
            this.startpoints = {};
            this.edge = new Vector.<int>();
            this.edgeNext = new Vector.<int>();
            super();
        }
    }
}
