// enum-classes.js
Java.perform(function () {
    var classes = Java.enumerateLoadedClassesSync();
    console.log("###JSON_START###" + JSON.stringify(classes) + "###JSON_END###");
  });
  