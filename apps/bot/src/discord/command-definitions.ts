import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";

const PHASE_CHOICES = [
  { name: "START — session open", value: "START" },
  { name: "OBJECTIVE — focus / target", value: "OBJECTIVE" },
  { name: "REMINDER — timed nudge", value: "REMINDER" },
  { name: "FINAL — closing phase", value: "FINAL" },
] as const;

/** Slash commands — single source for REST registration. */
export const commandBodies: RESTPostAPIApplicationCommandsJSONBody[] = [
  {
    type: ApplicationCommandType.ChatInput,
    name: "setup",
    description: "Guild setup",
    default_member_permissions: "8",
    dm_permission: false,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "channel",
        description: "Set battle text channel",
        options: [
          {
            type: ApplicationCommandOptionType.Channel,
            name: "target",
            description: "Text channel",
            required: true,
            channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
          },
        ],
      },
    ],
  },
  {
    type: ApplicationCommandType.ChatInput,
    name: "template",
    description: "Battle templates (phases / timeline)",
    default_member_permissions: "8",
    dm_permission: false,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "list",
        description: "List templates",
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "create",
        description: "New empty template",
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "name",
            description: "Id (e.g. swordland)",
            required: true,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "description",
            description: "Notes (optional)",
            required: false,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "delete",
        description: "Remove template",
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "name",
            description: "Template id",
            required: true,
            autocomplete: true,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "event_add",
        description: "Add a timed battle phase",
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "template",
            description: "Template id",
            required: true,
            autocomplete: true,
          },
          {
            type: ApplicationCommandOptionType.Integer,
            name: "offset_seconds",
            description: "Seconds after T+0",
            required: true,
            min_value: 0,
            max_value: 86_400,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "key",
            description: "Stable id (e.g. t900_objective)",
            required: true,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "phase_type",
            description: "Phase kind",
            required: true,
            choices: [...PHASE_CHOICES],
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "title",
            description: "Short headline (embed title)",
            required: true,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "objective",
            description: "What we want (optional)",
            required: false,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "action",
            description: "What to do now (optional)",
            required: false,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: "next_hint",
            description: "What comes next (optional)",
            required: false,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "default",
        description: "Default for /battle start",
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "name",
            description: "Template id",
            required: true,
            autocomplete: true,
          },
        ],
      },
    ],
  },
  {
    type: ApplicationCommandType.ChatInput,
    name: "battle",
    description: "Battle session",
    default_member_permissions: "8",
    dm_permission: false,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "start",
        description: "Start T+0",
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "template",
            description: "Template (else default)",
            required: false,
            autocomplete: true,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "stop",
        description: "End session, cancel timers",
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "pause",
        description: "Pause tactical pings (clear timers; pending kept)",
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "resume",
        description: "Resume pings for pending phases",
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "next-event",
        description: "Queue the next pending phase to fire now",
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "phase-now",
        description: "Post one pending phase immediately (template key)",
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "phase_key",
            description: "Phase key from template (e.g. t900_objective)",
            required: true,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "status",
        description: "Active session + next phase",
      },
    ],
  },
  {
    type: ApplicationCommandType.ChatInput,
    name: "announce",
    description: "Manual ping to battle channel",
    default_member_permissions: "8",
    dm_permission: false,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "message",
        description: "Short English",
        required: true,
      },
    ],
  },
  {
    type: ApplicationCommandType.ChatInput,
    name: "assign",
    description: "Slot → player",
    default_member_permissions: "8",
    dm_permission: false,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "slot",
        description: "Role/slot name",
        required: true,
      },
      {
        type: ApplicationCommandOptionType.User,
        name: "player",
        description: "Member",
        required: true,
      },
    ],
  },
];
