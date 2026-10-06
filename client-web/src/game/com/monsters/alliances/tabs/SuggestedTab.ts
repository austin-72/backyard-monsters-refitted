import * as as3 from "as3";
import { int } from "as3";
import { ALLIANCES, ALLIANCEWINDOW, GLOBAL, IoLeaderboards, KEYS, MembersTab } from "@game";

export class SuggestedTab extends MembersTab {
    public $ctor(): void {
        super.$ctor();
    }

    protected override get _titleKey(): string {
        return "alliance_suggested_title";
    }

    /**
     * Suggested members aren't in the alliance yet, so the actions are to
     * visit their base or invite them.
     * @param {Object} rowData - The row the actions apply to
     * @returns {Array} Visit Base + Invite actions for MemberActionPopup
     */
    protected override _actionsFor(rowData: any): any[] {
        if (GLOBAL.INFERNO_ONLY) {
            // (Inferno: yards can't be visited from here; the map can show where they are)
            return [{ labelKey: "io_alliance_act_jump", handler: as3.bind(this, this._ioOnJump) }, { labelKey: "alliance_btn_invite", handler: as3.bind(this, this._onInvite) }];
        }
        return [{ labelKey: "alliance_btn_visit", handler: as3.bind(this, this._onVisitBase) }, { labelKey: "alliance_btn_invite", handler: as3.bind(this, this._onInvite) }];
    }

    private _ioOnJump(rowData: any): void {
        ALLIANCEWINDOW.Hide();
        IoLeaderboards.JumpToPlayer(rowData.user_id | 0, String(rowData.name));
    }

    /**
     * Invites the suggested player. The store drops its candidate list on success,
     * so _load refetches and the invited player drops out of the table - the server
     * leaves out anyone already holding a pending invite.
     *
     * @param {Object} rowData - The row that was acted on
     */
    private _onInvite(rowData: any): void {
        ALLIANCES.InviteUser(rowData.user_id | 0, (response: any): void => {
            if (response == null) {
                GLOBAL.Message(KEYS.Get("alliance_err_generic"));
                return;
            }

            if (response.error) {
                GLOBAL.Message(String(response.error));
                return;
            }

            GLOBAL.Message(KEYS.Get("alliance_invite_sent"));

            this._load();
        });
    }

    /**
     * Candidates come from their own store cache rather than the roster one, but
     * arrive in the same row shape, so the inherited mapping and table draw them.
     */
    protected override _load(): void {
        let answeredDuringBuild: boolean = false;
        answeredDuringBuild = true;

        ALLIANCES.LoadSuggested((members: any[]): void => {
            this._members = (members != null) ? this._mapRows(members) : [];

            if (!answeredDuringBuild) {
                this._rerender();
            }
        });

        answeredDuringBuild = false;
    }
}
