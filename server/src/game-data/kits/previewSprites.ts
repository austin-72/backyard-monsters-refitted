/**
 * Building art used to draw outpost kit previews (src/scripts/export-kits.ts).
 * Generated from the client's prop tables (INFERNOYARDPROPS, OUTPOST_YARD_PROPS for the hall, YARD_PROPS for
 * decorations): file names and the offsets the game itself uses to place each sprite on a building.
 * `top` = [file, x, y]; `anim` = [sprite sheet, x, y, frame width, frame height] (frame 0 is drawn).
 */
export interface PreviewSprite { top?: [string, number, number]; anim?: [string, number, number, number, number]; }

export const previewSprites: Record<number, { base: string; levels: Record<number, PreviewSprite> }> = {
 "1": {
  base: "buildings/iboneharvester/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -48.0,
     -33.0
    ],
    anim: [
     "anim.1.v2.png",
     -32.0,
     -33.0,
     65.0,
     80.0
    ]
   },
   "3": {
    top: [
     "top.2.png",
     -44.0,
     25.0
    ],
    anim: [
     "anim.2.png",
     -44.0,
     -38.0,
     90.0,
     97.0
    ]
   }
  }
 },
 "2": {
  base: "buildings/icoalproducer/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -32.0,
     -40.0
    ],
    anim: [
     "anim.1.v2.png",
     -21.0,
     -45.0,
     40.0,
     18.0
    ]
   },
   "3": {
    top: [
     "top.2.png",
     -40.0,
     -50.0
    ],
    anim: [
     "anim.1.2.png",
     -40.0,
     -52.0,
     74.0,
     105.0
    ]
   }
  }
 },
 "3": {
  base: "buildings/isulpherproducer/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -24.0,
     -41.0
    ],
    anim: [
     "anim.1.v2.png",
     -35.0,
     -4.0,
     20.0,
     50.0
    ]
   },
   "3": {
    top: [
     "top.2.png",
     0.0,
     -15.0
    ],
    anim: [
     "anim1.2.png",
     -36.0,
     -60.0,
     60.0,
     118.0
    ]
   }
  }
 },
 "4": {
  base: "buildings/imagmaproducer/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -35.0,
     -15.0
    ],
    anim: [
     "anim.1.v2.png",
     9.2,
     12.6,
     25.0,
     31.0
    ]
   },
   "3": {
    top: [
     "top.2.png",
     -40.0,
     -15.0
    ],
    anim: [
     "anim.1.2.png",
     -37.0,
     -66.0,
     59.0,
     52.0
    ]
   }
  }
 },
 "5": {
  base: "buildings/flinger/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -46.0,
     -43.0
    ]
   },
   "2": {
    top: [
     "top.2.png",
     -45.0,
     -40.0
    ]
   },
   "3": {
    top: [
     "top.3.png",
     -47.0,
     -45.0
    ]
   },
   "4": {
    top: [
     "top.4.png",
     -45.0,
     -66.0
    ]
   }
  }
 },
 "6": {
  base: "buildings/istoragesilo/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -45.0,
     -58.0
    ]
   }
  }
 },
 "8": {
  base: "buildings/imonsterlab/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -56.0,
     8.0
    ],
    anim: [
     "anim.1.v2.png",
     -42.0,
     -41.0,
     86.0,
     88.0
    ]
   }
  }
 },
 "9": {
  base: "buildings/monsterjuiceloosener/",
  levels: {
   "1": {
    top: [
     "top.2.png",
     -44.0,
     -8.0
    ],
    anim: [
     "anim.2.png",
     -30.0,
     -17.0,
     60.0,
     39.0
    ]
   }
  }
 },
 "10": {
  base: "buildings/yardplanner/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -45.0,
     -29.0
    ]
   }
  }
 },
 "11": {
  base: "buildings/maproom/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -58.0,
     -67.0
    ]
   }
  }
 },
 "12": {
  base: "buildings/generalstore/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -40.0,
     -37.0
    ]
   }
  }
 },
 "13": {
  base: "buildings/ihatchery/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -55.0,
     -28.0
    ],
    anim: [
     "anim.1.v2.png",
     -48.0,
     -45.0,
     33.0,
     78.0
    ]
   }
  }
 },
 "14": {
  base: "buildings/itownhall/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -52.0,
     -31.0
    ]
   },
   "2": {
    top: [
     "top.2.v2.png",
     -50.0,
     -46.0
    ]
   },
   "3": {
    top: [
     "top.3.v2.png",
     -51.0,
     -57.0
    ]
   }
  }
 },
 "15": {
  base: "buildings/monsterhousing/",
  levels: {
   "1": {
    top: [
     "top.3.v2.png",
     -109.0,
     11.0
    ]
   }
  }
 },
 "16": {
  base: "buildings/hatcherycontrolcenter/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -40.0,
     -58.0
    ]
   }
  }
 },
 "17": {
  base: "buildings/iwalls/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -24.0,
     -5.0
    ]
   },
   "2": {
    top: [
     "top.2.v2.png",
     -20.0,
     -9.0
    ]
   },
   "3": {
    top: [
     "top.3.v2.png",
     -20.0,
     -27.0
    ]
   }
  }
 },
 "18": {
  base: "buildings/walls/stone/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -16.0,
     -21.0
    ]
   }
  }
 },
 "19": {
  base: "buildings/monsterbaiter/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -37.0,
     -6.0
    ],
    anim: [
     "anim.1.png",
     -33.0,
     -23.0,
     67.0,
     77.0
    ]
   }
  }
 },
 "20": {
  base: "buildings/icannontower/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -38.0,
     11.0
    ],
    anim: [
     "anim.1.v2.png",
     -38.0,
     -53.0,
     74.0,
     64.0
    ]
   }
  }
 },
 "21": {
  base: "buildings/isnipertower/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -35.0,
     -5.0
    ],
    anim: [
     "anim.1.v2.png",
     -56.0,
     -86.0,
     85.0,
     81.0
    ]
   }
  }
 },
 "22": {
  base: "buildings/bunker/",
  levels: {
   "1": {
    anim: [
     "anim.1.png",
     -46.0,
     -15.0,
     90.0,
     83.0
    ]
   }
  }
 },
 "23": {
  base: "buildings/lasertower/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -33.0,
     -29.0
    ],
    anim: [
     "anim.1.png",
     -13.0,
     -50.0,
     29.0,
     32.0
    ]
   }
  }
 },
 "24": {
  base: "buildings/boobytrap/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -15.0,
     1.0
    ]
   }
  }
 },
 "25": {
  base: "buildings/lightningtower/",
  levels: {
   "1": {
    top: [
     "top.3.png",
     -33.0,
     -57.0
    ],
    anim: [
     "anim.3.png",
     -25.0,
     -15.0,
     27.0,
     53.0
    ]
   }
  }
 },
 "26": {
  base: "buildings/iacademy/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -50.0,
     -55.0
    ],
    anim: [
     "anim1.1.png",
     11.0,
     -2.0,
     22.0,
     17.0
    ]
   },
   "2": {
    top: [
     "top.2.png",
     -56.0,
     -95.0
    ],
    anim: [
     "anim1.2.png",
     1.0,
     -18.0,
     44.0,
     26.0
    ]
   }
  }
 },
 "27": {
  base: "buildings/trojanhorse/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -91.0,
     -65.0
    ],
    anim: [
     "anim.1.png",
     -92.0,
     -23.0,
     39.0,
     31.0
    ]
   }
  }
 },
 "28": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-usa.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "29": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-britain.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "30": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-australia.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "31": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-brazil.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "32": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-europe.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "33": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-france.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "34": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-indonesian.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "35": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-italy.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "36": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-malaysia.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "37": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-dutch.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "38": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-newzealand.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "39": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-norway.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "40": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-poland.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "41": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-sweden.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "42": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-turkey.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "43": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-canadian.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "44": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-denmark.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "45": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-germany.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "46": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-philippines.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "47": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-singapore.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "48": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-austria.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "49": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-pirate.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "50": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -43.0
    ],
    anim: [
     "flag-peace.png",
     1.0,
     -35.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "51": {
  base: "buildings/catapult/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -43.0,
     12.0
    ]
   },
   "2": {
    top: [
     "top.2.png",
     -44.0,
     -21.0
    ]
   },
   "3": {
    top: [
     "top.3.png",
     -43.0,
     -29.0
    ]
   }
  }
 },
 "52": {
  base: "buildings/decorations/flags/",
  levels: {
   "1": {
    top: [
     "flagpole.png",
     -5.0,
     -33.0
    ],
    anim: [
     "flag-pirate.png",
     1.0,
     -25.0,
     24.0,
     30.0
    ]
   }
  }
 },
 "53": {
  base: "buildings/decorations/pumpkins/",
  levels: {
   "1": {
    anim: [
     "anim.png",
     -18.0,
     -15.0,
     37.0,
     36.0
    ]
   }
  }
 },
 "54": {
  base: "buildings/decorations/pumpkins/",
  levels: {
   "1": {
    top: [
     "large-top-6.png",
     -169.0,
     -60.0
    ],
    anim: [
     "large-anim-6.png",
     -119.0,
     -113.0,
     189.0,
     155.0
    ]
   }
  }
 },
 "55": {
  base: "buildings/decorations/acorn/",
  levels: {
   "1": {
    top: [
     "top.png",
     -10.0,
     -9.0
    ]
   }
  }
 },
 "56": {
  base: "buildings/decorations/beehive/",
  levels: {
   "1": {
    top: [
     "top.png",
     -18.0,
     -15.0
    ]
   }
  }
 },
 "57": {
  base: "buildings/decorations/birdhouse/",
  levels: {
   "1": {
    top: [
     "top.png",
     -16.0,
     -46.0
    ]
   }
  }
 },
 "58": {
  base: "buildings/decorations/campingtent/",
  levels: {
   "1": {
    top: [
     "top.png",
     -30.0,
     -12.0
    ]
   }
  }
 },
 "59": {
  base: "buildings/decorations/childrensjax/",
  levels: {
   "1": {
    top: [
     "top.png",
     -11.0,
     -11.0
    ]
   }
  }
 },
 "60": {
  base: "buildings/decorations/gnomes/",
  levels: {
   "1": {
    top: [
     "top-red.png",
     -10.0,
     -31.0
    ]
   }
  }
 },
 "61": {
  base: "buildings/decorations/gnomes/",
  levels: {
   "1": {
    top: [
     "top-blue.png",
     -10.0,
     -31.0
    ]
   }
  }
 },
 "62": {
  base: "buildings/decorations/gnomes/",
  levels: {
   "1": {
    top: [
     "top-green.png",
     -10.0,
     -31.0
    ]
   }
  }
 },
 "63": {
  base: "buildings/decorations/hammock/",
  levels: {
   "1": {
    top: [
     "top.png",
     -25.0,
     -8.0
    ]
   }
  }
 },
 "64": {
  base: "buildings/decorations/lawnchair/",
  levels: {
   "1": {
    top: [
     "top.png",
     -24.0,
     -14.0
    ]
   }
  }
 },
 "65": {
  base: "buildings/decorations/outhouse/",
  levels: {
   "1": {
    top: [
     "top.png",
     -16.0,
     -19.0
    ]
   }
  }
 },
 "66": {
  base: "buildings/decorations/pinecone/",
  levels: {
   "1": {
    top: [
     "top.png",
     -13.0,
     -10.0
    ]
   }
  }
 },
 "67": {
  base: "buildings/decorations/rock/",
  levels: {
   "1": {
    top: [
     "top.png",
     -15.0,
     0.0
    ]
   }
  }
 },
 "68": {
  base: "buildings/decorations/scaleelectriccartoyset/",
  levels: {
   "1": {
    top: [
     "top.png",
     -48.0,
     0.0
    ]
   }
  }
 },
 "69": {
  base: "buildings/decorations/scarecrow/",
  levels: {
   "1": {
    top: [
     "top.png",
     -25.0,
     -43.0
    ]
   }
  }
 },
 "70": {
  base: "buildings/decorations/sundial/",
  levels: {
   "1": {
    top: [
     "top.png",
     -23.0,
     -6.0
    ]
   }
  }
 },
 "71": {
  base: "buildings/decorations/tikitorch/",
  levels: {
   "1": {
    top: [
     "top.png",
     -8.0,
     -38.0
    ],
    anim: [
     "anim.png",
     -11.0,
     -71.0,
     16.0,
     36.0
    ]
   }
  }
 },
 "72": {
  base: "buildings/decorations/walnut/",
  levels: {
   "1": {
    top: [
     "top.png",
     -12.0,
     -2.0
    ]
   }
  }
 },
 "73": {
  base: "buildings/decorations/graveyardtombstone/",
  levels: {
   "1": {
    top: [
     "top.png",
     -22.0,
     -13.0
    ]
   }
  }
 },
 "74": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-pokey.png",
     -6.0,
     -28.0
    ]
   }
  }
 },
 "75": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-octo.png",
     -6.0,
     -23.0
    ]
   }
  }
 },
 "76": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-bolt.png",
     -10.0,
     -23.0
    ]
   }
  }
 },
 "77": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-bandito.png",
     -5.0,
     -26.0
    ]
   }
  }
 },
 "78": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-brain.png",
     -9.0,
     -28.0
    ]
   }
  }
 },
 "79": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-crabatron.png",
     -10.0,
     -29.0
    ]
   }
  }
 },
 "80": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-dave.png",
     -14.0,
     -30.0
    ]
   }
  }
 },
 "81": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-eyera.png",
     -4.0,
     -23.0
    ]
   }
  }
 },
 "82": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-fang.png",
     -10.0,
     -30.0
    ]
   }
  }
 },
 "83": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-fink.png",
     -11.0,
     -29.0
    ]
   }
  }
 },
 "84": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-ichi.png",
     -6.0,
     -29.0
    ]
   }
  }
 },
 "85": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-projectx.png",
     -19.0,
     -24.0
    ]
   }
  }
 },
 "86": {
  base: "buildings/decorations/blackberrybush/",
  levels: {
   "1": {
    top: [
     "top.png",
     -25.0,
     -13.0
    ]
   }
  }
 },
 "87": {
  base: "buildings/decorations/bonsaitree/",
  levels: {
   "1": {
    top: [
     "top.png",
     -41.0,
     -36.0
    ]
   }
  }
 },
 "88": {
  base: "buildings/decorations/cactus/",
  levels: {
   "1": {
    top: [
     "top.png",
     -14.0,
     -30.0
    ]
   }
  }
 },
 "89": {
  base: "buildings/decorations/flytrap/",
  levels: {
   "1": {
    top: [
     "top.png",
     -33.0,
     -5.0
    ]
   }
  }
 },
 "90": {
  base: "buildings/decorations/thorns/",
  levels: {
   "1": {
    top: [
     "top.png",
     -23.0,
     -18.0
    ]
   }
  }
 },
 "91": {
  base: "buildings/decorations/flowers/",
  levels: {
   "1": {
    top: [
     "top-pink.png",
     -18.0,
     -21.0
    ]
   }
  }
 },
 "92": {
  base: "buildings/decorations/flowers/",
  levels: {
   "1": {
    top: [
     "top-purple.png",
     -18.0,
     -21.0
    ]
   }
  }
 },
 "93": {
  base: "buildings/decorations/flowers/",
  levels: {
   "1": {
    top: [
     "top-red.png",
     -18.0,
     -21.0
    ]
   }
  }
 },
 "94": {
  base: "buildings/decorations/flowers/",
  levels: {
   "1": {
    top: [
     "top-white.png",
     -18.0,
     -21.0
    ]
   }
  }
 },
 "95": {
  base: "buildings/decorations/flowers/",
  levels: {
   "1": {
    top: [
     "top-yellow.png",
     -18.0,
     -21.0
    ]
   }
  }
 },
 "96": {
  base: "buildings/decorations/statue-baseball/",
  levels: {
   "1": {
    top: [
     "top.v2.png",
     -20.0,
     -36.0
    ]
   }
  }
 },
 "97": {
  base: "buildings/decorations/statue-football/",
  levels: {
   "1": {
    top: [
     "top.v2.png",
     -19.0,
     -39.0
    ]
   }
  }
 },
 "98": {
  base: "buildings/decorations/statue-soccer/",
  levels: {
   "1": {
    top: [
     "top.v2.png",
     -23.0,
     -36.0
    ]
   }
  }
 },
 "99": {
  base: "buildings/decorations/statue-liberty/",
  levels: {
   "1": {
    top: [
     "top.v2.png",
     -37.0,
     -118.0
    ]
   }
  }
 },
 "100": {
  base: "buildings/decorations/statue-eiffeltower/",
  levels: {
   "1": {
    top: [
     "top.png",
     -60.0,
     -121.0
    ]
   }
  }
 },
 "101": {
  base: "buildings/decorations/statue-bigben/",
  levels: {
   "1": {
    top: [
     "top.v2.png",
     -32.0,
     -104.0
    ]
   }
  }
 },
 "102": {
  base: "buildings/decorations/pool/",
  levels: {
   "1": {
    top: [
     "top.png",
     -65.0,
     8.0
    ]
   }
  }
 },
 "103": {
  base: "buildings/decorations/pond/",
  levels: {
   "1": {
    top: [
     "top.png",
     -40.0,
     14.0
    ]
   }
  }
 },
 "104": {
  base: "buildings/decorations/zengarden/",
  levels: {
   "1": {
    top: [
     "top.png",
     -72.0,
     -5.0
    ]
   }
  }
 },
 "105": {
  base: "buildings/decorations/fountain/",
  levels: {
   "1": {
    anim: [
     "anim.png",
     -47.0,
     -51.0,
     89.0,
     114.0
    ]
   }
  }
 },
 "106": {
  base: "buildings/decorations/japaneseteagarden/",
  levels: {
   "1": {
    top: [
     "top.png",
     -62.0,
     -38.0
    ]
   }
  }
 },
 "107": {
  base: "buildings/decorations/headsonsticks/",
  levels: {
   "1": {
    top: [
     "top-skull.png",
     -7.0,
     -39.0
    ]
   }
  }
 },
 "108": {
  base: "buildings/decorations/rubikscube/",
  levels: {
   "1": {
    top: [
     "top-unsolved.png",
     -20.0,
     -23.0
    ]
   }
  }
 },
 "109": {
  base: "buildings/decorations/rubikscube/",
  levels: {
   "1": {
    top: [
     "top-solved.png",
     -20.0,
     -23.0
    ]
   }
  }
 },
 "110": {
  base: "buildings/decorations/pumpkins/",
  levels: {
   "1": {
    top: [
     "attended-large-top.png",
     -24.0,
     -32.0
    ]
   }
  }
 },
 "111": {
  base: "buildings/decorations/pumpkins/",
  levels: {
   "1": {
    top: [
     "attended-small-top.png",
     -10.0,
     -4.0
    ]
   }
  }
 },
 "112": {
  base: "buildings/outpost/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -63.0,
     -72.0
    ]
   }
  }
 },
 "113": {
  base: "buildings/radiotower/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -40.0,
     -80.0
    ]
   }
  }
 },
 "114": {
  base: "buildings/monstercage/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -128.0,
     -13.0
    ]
   }
  }
 },
 "115": {
  base: "buildings/flaktower/",
  levels: {
   "1": {
    top: [
     "top.3.png",
     -39.0,
     6.0
    ],
    anim: [
     "anim.3.png",
     -32.0,
     -23.0,
     62.0,
     52.0
    ]
   }
  }
 },
 "116": {
  base: "buildings/monsterlab/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -74.0,
     -96.0
    ],
    anim: [
     "anim.1.png",
     -28.0,
     -30.0,
     54.0,
     48.0
    ]
   }
  }
 },
 "117": {
  base: "buildings/heavytrap/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -16.0,
     -5.0
    ]
   }
  }
 },
 "118": {
  base: "buildings/railguntower/",
  levels: {
   "1": {
    top: [
     "top.3.png",
     -39.0,
     7.0
    ],
    anim: [
     "anim.3.loaded.png",
     -49.0,
     -9.0,
     96.0,
     56.0
    ]
   }
  }
 },
 "119": {
  base: "buildings/champchamber/",
  levels: {
   "1": {
    top: [
     "top.3.png",
     -66.0,
     -62.0
    ]
   }
  }
 },
 "127": {
  base: "buildings/iportal/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -85.0,
     -5.0
    ]
   },
   "2": {
    top: [
     "top.2.v2.png",
     -105.0,
     -29.0
    ]
   },
   "3": {
    top: [
     "top.3.v2.png",
     -136.0,
     -64.0
    ]
   },
   "4": {
    top: [
     "top.4.v2.png",
     -140.0,
     -114.0
    ]
   },
   "5": {
    top: [
     "top.5.v2.png",
     -160.0,
     -172.0
    ]
   }
  }
 },
 "128": {
  base: "buildings/ihousingbunker/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -110.0,
     -49.0
    ]
   }
  }
 },
 "129": {
  base: "buildings/iquaketower/",
  levels: {
   "1": {
    anim: [
     "anim.1.png",
     -37.0,
     -75.0,
     75.0,
     132.0
    ]
   }
  }
 },
 "130": {
  base: "buildings/icannontower/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -38.0,
     11.0
    ],
    anim: [
     "anim.1.v2.png",
     -38.0,
     -53.0,
     74.0,
     64.0
    ]
   }
  }
 },
 "131": {
  base: "buildings/decorations/wmitotem2/",
  levels: {
   "1": {
    top: [
     "top1.png",
     -31.0,
     -25.0
    ]
   },
   "2": {
    top: [
     "top2.png",
     -31.0,
     -60.0
    ]
   },
   "3": {
    top: [
     "top3.png",
     -31.0,
     -86.0
    ]
   },
   "4": {
    top: [
     "top4.png",
     -31.0,
     -122.0
    ]
   },
   "5": {
    top: [
     "top5.v2.png",
     -30.0,
     -125.0
    ]
   },
   "6": {
    top: [
     "top6.png",
     -31.0,
     -128.0
    ]
   }
  }
 },
 "132": {
  base: "buildings/imagmatower/",
  levels: {
   "1": {
    top: [
     "top.1.v2.png",
     -34.0,
     -9.0
    ],
    anim: [
     "anim.1.v2.png",
     -26.0,
     -50.0,
     54.0,
     42.0
    ]
   }
  }
 },
 "133": {
  base: "buildings/siegefactory/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -75.0,
     -23.0
    ],
    anim: [
     "anim.1.png",
     -76.0,
     -101.0,
     154.0,
     80.0
    ]
   }
  }
 },
 "134": {
  base: "buildings/siegelab/",
  levels: {
   "1": {
    top: [
     "top.1.png",
     -68.0,
     -66.0
    ],
    anim: [
     "anim.1.png",
     -70.0,
     -106.0,
     118.0,
     166.0
    ]
   }
  }
 },
 "135": {
  base: "buildings/decorations/dave_trophy/",
  levels: {
   "1": {
    top: [
     "top.png",
     -38.0,
     -30.0
    ]
   }
  }
 }
};
