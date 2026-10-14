# Proguard rules for Waddle
-keep class com.waddle.app.models.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
