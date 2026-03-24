import { loadBotEnv } from "../src/config/load-dotenv.js";

loadBotEnv();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const discordGuildId = process.env.SEED_DISCORD_GUILD_ID?.trim();
  if (!discordGuildId) {
    console.log(
      "Seed skip: set SEED_DISCORD_GUILD_ID to your Discord server id (Developer Mode → Copy Server ID).",
    );
    return;
  }

  const guild = await prisma.guildSettings.upsert({
    where: { discordGuildId },
    create: { discordGuildId },
    update: {},
  });

  const existing = await prisma.battleTemplate.findFirst({
    where: { guildId: guild.id, name: "swordland" },
  });
  if (existing) {
    console.log("Seed skip: template `swordland` already exists.");
    return;
  }

  await prisma.battleTemplate.updateMany({
    where: { guildId: guild.id },
    data: { isDefault: false },
  });

  const template = await prisma.battleTemplate.create({
    data: {
      guildId: guild.id,
      name: "swordland",
      description: "Swordland — structured battle timeline",
      eventDurationMinutes: 75,
      isDefault: true,
      events: {
        create: [
          {
            offsetSeconds: 0,
            key: "t0_start",
            phaseType: "START",
            title: "Battle underway",
            objective: "Secure early building control before the field stabilizes.",
            action: "Battle started. Focus early building control.",
            nextHint: "Hold comms clear for shotcaller callouts.",
            orderIndex: 0,
          },
          {
            offsetSeconds: 900,
            key: "t900_objectives_live",
            phaseType: "OBJECTIVE",
            title: "Objectives online",
            objective:
              "Swordshrine, Mercenary Camp, and Hall of Reformation are now contestable.",
            action:
              "Event live. Swordshrine / Mercenary Camp / Hall of Reformation available now.",
            nextHint: "Leads: confirm assignments and move on ping.",
            orderIndex: 0,
          },
          {
            offsetSeconds: 900,
            key: "t900_leaders",
            phaseType: "REMINDER",
            title: "Lead roster",
            objective: "Named leads execute their lanes without overlap.",
            action: "Assigned leaders move now.",
            nextHint: "Shotcaller: confirm eyes on each objective.",
            orderIndex: 1,
          },
          {
            offsetSeconds: 1200,
            key: "t1200_reinforce",
            phaseType: "REMINDER",
            title: "Reinforce windows",
            objective: "Stabilize holds before the next rally wave.",
            action: "Reinforce before relaunching rallies.",
            nextHint: "Check dead timers and hospital before you re-engage.",
            orderIndex: 2,
          },
          {
            offsetSeconds: 1500,
            key: "t1500_priority",
            phaseType: "OBJECTIVE",
            title: "Strategic priority",
            objective: "Building control still wins the exchange — don’t chase scraps.",
            action: "Priority remains building control.",
            nextHint: "City phase opens soon; conserve key marches.",
            orderIndex: 3,
          },
          {
            offsetSeconds: 1800,
            key: "t1800_city",
            phaseType: "OBJECTIVE",
            title: "City phase",
            objective: "Ten-minute window: city attacks are authorized.",
            action: "Last 10 minutes. City attacks allowed.",
            nextHint: "Prep final rallies; conserve shields for the close.",
            orderIndex: 4,
          },
          {
            offsetSeconds: 2100,
            key: "t2100_final",
            phaseType: "FINAL",
            title: "Final push",
            objective: "Maximize structure holds and reward efficiency.",
            action: "Final push. Hold buildings and maximize rewards.",
            nextHint: "Fight clean — no throw rallies. Finish strong.",
            orderIndex: 5,
          },
        ],
      },
    },
  });

  await prisma.guildSettings.update({
    where: { id: guild.id },
    data: { defaultTemplateId: template.id },
  });

  console.log("Seeded default template `swordland` (7 structured phases).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
