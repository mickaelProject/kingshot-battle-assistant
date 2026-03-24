import { loadBotEnv } from "../src/config/load-dotenv.js";

loadBotEnv();

import { REST, Routes } from "discord.js";
import { commandBodies } from "../src/discord/command-definitions.js";
import { discordEnv } from "../src/config/discord-env.js";

const rest = new REST({ version: "10" }).setToken(discordEnv.token);

const body = commandBodies;

if (discordEnv.devGuildId) {
  await rest.put(
    Routes.applicationGuildCommands(
      discordEnv.clientId,
      discordEnv.devGuildId,
    ),
    { body },
  );
  console.log(`Registered ${body.length} guild commands (dev).`);
} else {
  await rest.put(Routes.applicationCommands(discordEnv.clientId), { body });
  console.log(`Registered ${body.length} global commands (can take up to 1h).`);
}
