-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EARN', 'SPEND', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('DIAMOND', 'MONEY');

-- CreateEnum
CREATE TYPE "ShopCategory" AS ENUM ('HERO', 'SHIELD', 'CHEST', 'VIP', 'COSMETIC');

-- CreateEnum
CREATE TYPE "ChestType" AS ENUM ('BASIC', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('WAITING', 'STARTING', 'NIGHT', 'DAY', 'VOTING', 'CONFIRMING', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Winner" AS ENUM ('TOWN', 'MAFIA', 'SOLO', 'DRAW');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CIVILIAN', 'DOCTOR', 'TRAMP', 'SHERIFF', 'KAMIKAZE', 'HOOKER', 'SERGEANT', 'WARLOCK', 'SANTA', 'SNOWBOY', 'DON', 'MAFIA', 'LAWYER', 'SPY', 'LAB', 'KILLER', 'MINER', 'SNIPER', 'ARCHER', 'TRAITOR', 'ROBBER', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "DeathCause" AS ENUM ('MAFIA_KILL', 'SHERIFF_KILL', 'KILLER_KILL', 'SNIPER_KILL', 'ARCHER_KILL', 'MINER_KILL', 'SNOWBOY_KILL', 'LAB_KILL', 'WARLOCK_KILL', 'KAMIKAZE_KILL', 'ROBBER_KILL', 'PROFESSOR_KILL', 'VOTED_OUT', 'LEFT_GAME');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('NIGHT', 'DAY', 'VOTING');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('MAFIA_KILL', 'LAWYER_PROTECT', 'SPY_CHECK', 'LAB_ACTION', 'SHERIFF_CHECK', 'SERGEANT_INFO', 'DOCTOR_HEAL', 'TRAMP_VISIT', 'HOOKER_BLOCK', 'WARLOCK_ACTION', 'KAMIKAZE_TAKE', 'SANTA_GIFT', 'SNOWBOY_KILL', 'KILLER_KILL', 'SNIPER_KILL', 'ARCHER_KILL', 'MINER_PLANT', 'TRAITOR_CHOOSE', 'ROBBER_ROB', 'PROFESSOR_GIFT', 'VOTE', 'SKIP');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "language" TEXT NOT NULL DEFAULT 'uz',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "muteExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "diamonds" INTEGER NOT NULL DEFAULT 0,
    "money" INTEGER NOT NULL DEFAULT 0,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "vipExpiresAt" TIMESTAMP(3),
    "hasHero" BOOLEAN NOT NULL DEFAULT false,
    "heroUsedAt" TIMESTAMP(3),
    "hasShield" BOOLEAN NOT NULL DEFAULT false,
    "lastChestOpenedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "gamesLost" INTEGER NOT NULL DEFAULT 0,
    "timesCivilian" INTEGER NOT NULL DEFAULT 0,
    "timesDoctor" INTEGER NOT NULL DEFAULT 0,
    "timesTramp" INTEGER NOT NULL DEFAULT 0,
    "timesSheriff" INTEGER NOT NULL DEFAULT 0,
    "timesKamikaze" INTEGER NOT NULL DEFAULT 0,
    "timesHooker" INTEGER NOT NULL DEFAULT 0,
    "timesSergeant" INTEGER NOT NULL DEFAULT 0,
    "timesWarlock" INTEGER NOT NULL DEFAULT 0,
    "timesSanta" INTEGER NOT NULL DEFAULT 0,
    "timesSnowboy" INTEGER NOT NULL DEFAULT 0,
    "timesDon" INTEGER NOT NULL DEFAULT 0,
    "timesMafia" INTEGER NOT NULL DEFAULT 0,
    "timesLawyer" INTEGER NOT NULL DEFAULT 0,
    "timesSpy" INTEGER NOT NULL DEFAULT 0,
    "timesLab" INTEGER NOT NULL DEFAULT 0,
    "timesKiller" INTEGER NOT NULL DEFAULT 0,
    "timesMiner" INTEGER NOT NULL DEFAULT 0,
    "timesSniper" INTEGER NOT NULL DEFAULT 0,
    "timesArcher" INTEGER NOT NULL DEFAULT 0,
    "timesTraitor" INTEGER NOT NULL DEFAULT 0,
    "timesRobber" INTEGER NOT NULL DEFAULT 0,
    "timesProfessor" INTEGER NOT NULL DEFAULT 0,
    "killCount" INTEGER NOT NULL DEFAULT 0,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "correctChecks" INTEGER NOT NULL DEFAULT 0,
    "winStreak" INTEGER NOT NULL DEFAULT 0,
    "maxWinStreak" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "relatedId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "category" "ShopCategory" NOT NULL,
    "priceType" "Currency" NOT NULL,
    "price" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "ChestType" NOT NULL,
    "reward" TEXT,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'uz',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSettings" (
    "id" SERIAL NOT NULL,
    "chatId" INTEGER NOT NULL,
    "registrationTimeout" INTEGER NOT NULL DEFAULT 90,
    "nightTimeout" INTEGER NOT NULL DEFAULT 60,
    "dayDiscussionTimeout" INTEGER NOT NULL DEFAULT 90,
    "votingTimeout" INTEGER NOT NULL DEFAULT 60,
    "minPlayers" INTEGER NOT NULL DEFAULT 4,
    "maxPlayers" INTEGER NOT NULL DEFAULT 30,
    "showRoleOnDeath" BOOLEAN NOT NULL DEFAULT true,
    "allowSelfVote" BOOLEAN NOT NULL DEFAULT false,
    "muteOnNight" BOOLEAN NOT NULL DEFAULT false,
    "enableTramp" BOOLEAN NOT NULL DEFAULT true,
    "enableKamikaze" BOOLEAN NOT NULL DEFAULT true,
    "enableHooker" BOOLEAN NOT NULL DEFAULT true,
    "enableSergeant" BOOLEAN NOT NULL DEFAULT true,
    "enableWarlock" BOOLEAN NOT NULL DEFAULT true,
    "enableSanta" BOOLEAN NOT NULL DEFAULT false,
    "enableSnowboy" BOOLEAN NOT NULL DEFAULT false,
    "enableLawyer" BOOLEAN NOT NULL DEFAULT true,
    "enableSpy" BOOLEAN NOT NULL DEFAULT true,
    "enableLab" BOOLEAN NOT NULL DEFAULT true,
    "enableKiller" BOOLEAN NOT NULL DEFAULT true,
    "enableMiner" BOOLEAN NOT NULL DEFAULT true,
    "enableSniper" BOOLEAN NOT NULL DEFAULT true,
    "enableArcher" BOOLEAN NOT NULL DEFAULT true,
    "enableTraitor" BOOLEAN NOT NULL DEFAULT true,
    "enableRobber" BOOLEAN NOT NULL DEFAULT false,
    "enableProfessor" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "chatId" INTEGER NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'WAITING',
    "winner" "Winner",
    "roundCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "Role",
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "deathRound" INTEGER,
    "deathCause" "DeathCause",
    "hasHeroActive" BOOLEAN NOT NULL DEFAULT false,
    "hasShieldActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "roundNum" INTEGER NOT NULL,
    "phase" "Phase" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "targetId" INTEGER,
    "type" "ActionType" NOT NULL,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");

-- CreateIndex
CREATE INDEX "Chest_userId_idx" ON "Chest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_telegramId_key" ON "Chat"("telegramId");

-- CreateIndex
CREATE INDEX "Chat_telegramId_idx" ON "Chat"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatSettings_chatId_key" ON "ChatSettings"("chatId");

-- CreateIndex
CREATE INDEX "Game_chatId_status_idx" ON "Game"("chatId", "status");

-- CreateIndex
CREATE INDEX "Player_gameId_isAlive_idx" ON "Player"("gameId", "isAlive");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_userId_key" ON "Player"("gameId", "userId");

-- CreateIndex
CREATE INDEX "GameRound_gameId_idx" ON "GameRound"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_gameId_roundNum_phase_key" ON "GameRound"("gameId", "roundNum", "phase");

-- CreateIndex
CREATE INDEX "Action_roundId_type_idx" ON "Action"("roundId", "type");

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chest" ADD CONSTRAINT "Chest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSettings" ADD CONSTRAINT "ChatSettings_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
