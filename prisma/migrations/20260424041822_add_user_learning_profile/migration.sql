-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_learning_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "interfaceLanguage" "LanguageCode" NOT NULL,
    "targetLanguage" "LanguageCode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_learning_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_learning_profile_themes" (
    "userLearningProfileId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    CONSTRAINT "user_learning_profile_themes_pkey" PRIMARY KEY ("userLearningProfileId","themeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_learning_profiles_userId_key" ON "user_learning_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_learning_profiles_targetLanguage_idx" ON "user_learning_profiles"("targetLanguage");

-- CreateIndex
CREATE UNIQUE INDEX "user_learning_profiles_userId_targetLanguage_key" ON "user_learning_profiles"("userId", "targetLanguage");

-- CreateIndex
CREATE INDEX "user_learning_profile_themes_themeId_idx" ON "user_learning_profile_themes"("themeId");

-- CreateIndex
CREATE INDEX "themes_slug_idx" ON "themes"("slug");

-- CreateIndex
CREATE INDEX "vocabulary_words_normalizedTerm_idx" ON "vocabulary_words"("normalizedTerm");

-- AddForeignKey
ALTER TABLE "user_learning_profiles" ADD CONSTRAINT "user_learning_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learning_profile_themes" ADD CONSTRAINT "user_learning_profile_themes_userLearningProfileId_fkey" FOREIGN KEY ("userLearningProfileId") REFERENCES "user_learning_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_learning_profile_themes" ADD CONSTRAINT "user_learning_profile_themes_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
