# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.SerializationKt
-keep,includedescriptorclasses class com.livebox.tv.**$$serializer { *; }
-keepclassmembers class com.livebox.tv.** {
    *** Companion;
}
-keepclasseswithmembers class com.livebox.tv.** {
    kotlinx.serialization.KSerializer serializer(...);
}
