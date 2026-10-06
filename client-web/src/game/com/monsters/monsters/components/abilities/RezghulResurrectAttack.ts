import * as as3 from "as3";
import { Vector, int, uint } from "as3";
import { Point } from "flash/geom";
import { CREATURELOCKER, CREATURES, CREEPS, CreepBase, EFFECTS, GIBLETS, GLOBAL, ITargetable, MAP, ProjectileEvent, Projectilev2, RangedAttack, Sine, Targeting, TweenLite, Zombiefy } from "@game";

export class RezghulResurrectAttack extends RangedAttack {
    static {
        as3.fields(this, { m_zombiefy: null, m_resurrectRange: 0 });
    }

    private static readonly k_UNRESURRECTABLE_CREATURES: Vector<string> = Vector.from(["C16", "C15", "C19", "C18"], String);

    /** Inferno-only: the share of its health a champion comes back with. */
    private static readonly k_IO_CHAMPION_HEALTH: number = 0.25;
    private m_zombiefy: Zombiefy;
    private m_resurrectRange: uint;

    public $ctor(projRange?: uint, rechargeTime?: int, targetFlags?: int, resAreaRange?: any /* uint */, proj?: Projectilev2, zombieComponent?: Zombiefy): void {
        super.$ctor(projRange, rechargeTime, targetFlags, proj);
        this.m_zombiefy = zombieComponent;
        this.m_resurrectRange = resAreaRange;
    }

    protected override getValidTargetsInRange(param1: uint, param2: Point, param3: int): Vector<ITargetable> {
        // Rezghul can die (and this ability lose its owner) while his last shot is still flying: the shot
        // landing then threw here on every frame, which stopped the battle's frame work, so the dead
        // monsters were never cleared and the attack never ended.
        if (!this.owner || !this.owner.inBattleState) {
            return null;
        }
        let targets: Vector<ITargetable> = null;
        let currentCreep: ITargetable = null;
        let allDeadCreeps: any[] = Targeting.getDeadCreeps(param2, param1, param3);
        let idx: int = 0;
        while (idx < allDeadCreeps.length) {
            if (!targets) {
                targets = new Vector<ITargetable>(0, false, ITargetable);
            }
            // Rezghul only ever raises his own side's dead. The team flags passed in already say so; this
            // checks the corpse itself as well, so an enemy's Compound or bunker defenders can never
            // come back, whatever flags a monster ended up with.
            if ((currentCreep = as3.cast(allDeadCreeps[idx].creep, ITargetable)) instanceof CreepBase && as3.cast(currentCreep, CreepBase)._friendly == this.owner._friendly && RezghulResurrectAttack.k_UNRESURRECTABLE_CREATURES.indexOf(as3.cast(currentCreep, CreepBase)._creatureID) == -1) {
                targets.push(currentCreep);
            }
            idx++;
        }
        return targets;
    }

    /** A champion: a monster of the Strongbox's level-5 page (Korath, Drull and Ashkarr in the Inferno). */
    private static ioIsChampion(param1: string): boolean {
        let creature: any = CREATURELOCKER._creatures ? CREATURELOCKER._creatures[param1] : null;
        return creature != null && creature.page == 5;
    }

    protected override fireAt(target: ITargetable): Projectilev2 {
        let proj: Projectilev2 = super.fireAt(target);
        proj.addEventListener(ProjectileEvent.k_hit, as3.bind(this, this.onProjectileHit), false, 0, true);
        return proj;
    }

    protected onProjectileHit(event: ProjectileEvent): void {
        let proj: Projectilev2 = as3.as(event.target, Projectilev2);
        proj.removeEventListener(ProjectileEvent.k_hit, as3.bind(this, this.onProjectileHit));
        this.resurrectAlliesInArea(proj);
    }

    private resurrectAlliesInArea(proj: Projectilev2): void {
        if (!this.owner) {
            return;
        }
        let idx: int = 0;
        let currentCreep: ITargetable = null;
        let deadCreepsInRange: Vector<ITargetable> = this.getValidTargetsInRange(this.m_resurrectRange, new Point(proj.x, proj.y), this.m_targetFlags);
        if (deadCreepsInRange) {
            idx = 0;
            while (idx < deadCreepsInRange.length) {
                if ((currentCreep = as3.vget(deadCreepsInRange, idx)) instanceof CreepBase && as3.cast(currentCreep, CreepBase)._friendly == this.owner._friendly && RezghulResurrectAttack.k_UNRESURRECTABLE_CREATURES.indexOf(as3.cast(currentCreep, CreepBase)._creatureID) == -1) {
                    this.resurrect(as3.as(currentCreep, CreepBase));
                }
                idx++;
            }
        }
    }

    private resurrect(monsterToRes: CreepBase): void {
        let newMonster: CreepBase = null;
        if (this.owner._friendly) {
            newMonster = as3.as(CREATURES.Spawn(monsterToRes._creatureID, MAP._BUILDINGTOPS, monsterToRes._behaviour, new Point(monsterToRes.x, monsterToRes.y), monsterToRes._targetRotation, null, monsterToRes._house), CreepBase);
        } else {
            newMonster = as3.as(CREEPS.Spawn(monsterToRes._creatureID, MAP._BUILDINGTOPS, monsterToRes._behaviour, new Point(monsterToRes.x, monsterToRes.y), monsterToRes._targetRotation, 1, false, true), CreepBase);
        }
        EFFECTS.Dig(newMonster.x | 0, (newMonster.y + 20) | 0);
        TweenLite.from(newMonster._graphicMC, 0.8, { "y": newMonster._graphicMC.y + 20, "ease": Sine.easeOut, "overwrite": false, "onComplete": (newMonster._friendly ? as3.bind(newMonster, newMonster.findDefenseTargets) : as3.bind(newMonster, newMonster.findTarget)) });
        GIBLETS.Create(new Point(newMonster.x, newMonster.y + 20), 1, 50, 20, 10);
        // Inferno-only (balance pass, 30 September): a raised monster comes back with 75% of its health (the
        // zombie health multiplier, CREATURELOCKER.ioApplyRezghul), a champion (Korath, Drull, Ashkarr: the
        // Strongbox's level-5 page) with 25%.
        if (GLOBAL.INFERNO_ONLY && RezghulResurrectAttack.ioIsChampion(monsterToRes._creatureID)) {
            newMonster.addComponent(this.m_zombiefy.ioCloneWithHealth(RezghulResurrectAttack.k_IO_CHAMPION_HEALTH));
        } else {
            newMonster.addComponent(this.m_zombiefy.clone());
        }
        monsterToRes.corpseDeath();
    }
}
