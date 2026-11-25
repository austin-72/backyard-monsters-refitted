import { POWERUP_LABEL, SHOUT_TEXT, STANCE_LABEL } from "../../config/AllianceConfig.js";
import { AllianceMessageType, type AllianceStance, type AlliancePowerupType } from "../../enums/Alliance.js";
import type { Alliance } from "../../database/models/alliance.model.js";


type ShoutTarget = Pick<Alliance, "name"> | null;

/**
 * Builds a membership shout: promotions, joins, kicks, departures, creation.
 *
 * @param {string} username - The member the shout is about.
 * @param {AllianceMessageType} type - Which shout to build.
 * @returns {string} The finished sentence, or empty if this type has no text.
 */
const createShoutText = (username: string, type: AllianceMessageType): string => {
  const sentence = SHOUT_TEXT[type];

  if (!sentence) return "";

  return `${username} ${sentence}`;
};

/**
 * Builds a relationship shout.
 *
 * The verb is chosen by whether the name ends in "s", which is what the original
 * did - confirmed against footage of one leader flagging five alliances in a
 * row, where `have` appeared for exactly the two names ending in s.
 *
 * @param {string} allianceName - The alliance that was flagged.
 * @param {AllianceStance} relationship - What it was flagged as.
 * @returns {string} The finished sentence.
 */
const createRelationshipShoutText = (allianceName: string, relationship: AllianceStance) => {
  const verb = allianceName.toLowerCase().endsWith("s") ? "have" : "has";

  return `"${allianceName}" ${verb} been flagged as ${STANCE_LABEL[relationship]}`;
};

/**
 * Builds the shout for a leader starting a power-up.
 *
 * @param {string} username - The leader who activated it.
 * @param {string} body - The stored power-up type.
 * @returns {string} The finished sentence, or empty if the type is unknown.
 */
const createPowerupActivatedText = (username: string, body: string) => {
  // (Inferno-only, 22 October: a Tier II start's body is JSON with its tier and hours)
  if (body.startsWith("{")) {
    try {
      const { powerup, hours } = JSON.parse(body) as { powerup?: string; hours?: number };
      const label = POWERUP_LABEL[powerup as AlliancePowerupType];
      return label ? `${username} activated the ${label} Power-Up at Tier II: ${Number(hours) || 0} hours!` : "";
    } catch {
      return "";
    }
  }
  const label = POWERUP_LABEL[body as AlliancePowerupType];

  if (!label) return "";

  return `${username} activated the ${label} Power-Up!`;
};

/**
 * Builds the shout for a member spending Shiny on a power-up's charge.
 *
 * @param {string} username - The member who paid.
 * @param {string} body - JSON: the power-up type and hours bought.
 * @returns {string} The finished sentence, or empty if the payload is unusable.
 */
const createPowerupPurchaseText = (username: string, body: string) => {
  let payload: { powerup?: string; hours?: number };

  try {
    payload = JSON.parse(body);
  } catch {
    return "";
  }

  const label = POWERUP_LABEL[payload.powerup as AlliancePowerupType];
  const hours = Number(payload.hours);

  if (!label || !hours) return "";

  return `${username} has reduced the ${label} Power-Up by ${hours} ${hours === 1 ? "hour" : "hours"}.`;
};

/**
 * Picks the right builder for a stored row.
 *
 * The membership shouts are the default: their whole sentence is the author's
 * name plus a fixed suffix. The three cases above it each need something the
 * author does not carry, which is what `body` is for - a relationship shout
 * stores its flag value, an activation the power-up started, a purchase the
 * power-up and the hours bought.
 *
 * @param {AllianceMessageType} type - Which shout this is.
 * @param {string} username - The author, subject of every membership shout.
 * @param {string} body - Whatever the sentence needs beyond the author's name.
 * @param {ShoutTarget} targetAlliance - The flagged alliance, present only on a relationship shout.
 * @returns {string} The finished sentence, or empty if it cannot be built.
 */
export const composeShout = (type: AllianceMessageType, username: string, body: string, targetAlliance?: ShoutTarget) => {
  switch (type) {
    case AllianceMessageType.POWERUP_ACTIVATED:
      return createPowerupActivatedText(username, body);

    case AllianceMessageType.POWERUP_PURCHASE:
      return createPowerupPurchaseText(username, body);

    case AllianceMessageType.PINNED:
      return `${username} pinned to the board: ${body}`;

    case AllianceMessageType.RENAMED: {
      try {
        const { from, to } = JSON.parse(body) as { from?: string; to?: string };
        return from && to ? `${username} renamed the alliance from ${from} to ${to}.` : "";
      } catch {
        return "";
      }
    }

    case AllianceMessageType.POWERUP_STATE: {
      try {
        const { powerup, state, at, tier, hours } = JSON.parse(body) as { powerup?: string; state?: string; at?: number; tier?: number; hours?: number };
        const label = POWERUP_LABEL[powerup as AlliancePowerupType];
        if (!label) return "";
        // (Inferno-only, 22 October: planned starts. {at:N} is a time the game shows in the player's own clock)
        const tierWords = Number(tier) === 2 ? ` at Tier II (${Number(hours) || 0} hours)` : "";
        if (state === "planned") return `${username} planned the ${label} Power-Up${tierWords} to start {at:${Number(at) || 0}}.`;
        if (state === "unplanned") return `${username} cancelled the planned start of the ${label} Power-Up.`;
        if (state === "soon") return `The ${label} Power-Up starts {in:${Number(at) || 0}}, as ${username} planned.`;
        if (state === "plan_started") return `The ${label} Power-Up has started${tierWords}, as ${username} planned!`;
        if (state === "plan_failed") return `The ${label} Power-Up couldn't start as ${username} planned: it wasn't charged, or was already running.`;
        return state === "ready" ? `The ${label} Power-Up is charged: the leader can start it.` : `The ${label} Power-Up has ended and is recharging.`;
      } catch {
        return "";
      }
    }

    case AllianceMessageType.OFFICER:
      return body === "1" ? `${username} is now an officer.` : `${username} is no longer an officer.`;

    case AllianceMessageType.RELATIONSHIP:
      if (!targetAlliance) return "";

      // (Inferno-only, QoL #176: "in:<stance>" is the line in the other alliance's feed: how it now sees them)
      if (body.startsWith("in:")) return createIncomingStanceText(targetAlliance.name, Number(body.slice(3)) as AllianceStance);

      return createRelationshipShoutText(targetAlliance.name, Number(body) as AllianceStance);

    // (Inferno-only, QoL #501: who removed them, and who brought them back; QoL #172: who took the lead from whom)
    case AllianceMessageType.KICKED:
    case AllianceMessageType.JOINED:
    case AllianceMessageType.PROMOTED: {
      const extra = parseExtra(body);
      if (type === AllianceMessageType.KICKED && extra.by) return `${username} has been removed from the alliance by ${extra.by}.`;
      if (type === AllianceMessageType.JOINED && extra.back) return `${username} is back in the alliance: ${extra.back} undid their removal.`;
      if (type === AllianceMessageType.PROMOTED && extra.took) return `${username} has taken the lead: ${extra.took} hadn't been seen for 14 days.`;
      return createShoutText(username, type);
    }

    default:
      return createShoutText(username, type);
  }
};

/** The few words some notices keep in their body (QoL #501, #172): { by?, back?, took? }; {} for the stock "". */
const parseExtra = (body: string): { by?: string; back?: string; took?: string } => {
  if (!body || body[0] !== "{") return {};
  try {
    const o = JSON.parse(body) as Record<string, unknown>;
    return {
      by: typeof o.by === "string" ? o.by : undefined,
      back: typeof o.back === "string" ? o.back : undefined,
      took: typeof o.took === "string" ? o.took : undefined,
    };
  } catch {
    return {};
  }
};

/**
 * (Inferno-only, QoL #176) The line in an alliance's own feed when another alliance flags it: it was never told.
 *
 * @param {string} allianceName - The alliance that set the flag.
 * @param {AllianceStance} relationship - What it flagged them as.
 */
const createIncomingStanceText = (allianceName: string, relationship: AllianceStance) => {
  const label = STANCE_LABEL[relationship];
  if (!label) return "";
  return `"${allianceName}" now sees your alliance as ${label}.`;
};
