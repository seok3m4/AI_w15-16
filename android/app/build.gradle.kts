import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.kominsuk.kbofanhub"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kominsuk.kbofanhub"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        val webAppUrl =
            providers.gradleProperty("KBO_WEB_APP_URL")
                .orElse("http://10.0.2.2:3000/mobile-app")
                .get()

        buildConfigField("String", "KBO_WEB_APP_URL", "\"$webAppUrl\"")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}
