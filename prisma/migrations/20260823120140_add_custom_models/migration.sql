-- CreateTable
CREATE TABLE "CustomModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "apiKey" TEXT,
    "baseURL" TEXT,
    "contextWindow" INTEGER NOT NULL,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "supportsFiles" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '新对话',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "customModelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_customModelId_fkey" FOREIGN KEY ("customModelId") REFERENCES "CustomModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Conversation" ("createdAt", "id", "model", "title", "updatedAt", "userId") SELECT "createdAt", "id", "model", "title", "updatedAt", "userId" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
CREATE INDEX "Conversation_userId_updatedAt_idx" ON "Conversation"("userId", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CustomModel_userId_modelId_key" ON "CustomModel"("userId", "modelId");
