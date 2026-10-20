---
name: Plate OCR validation
description: Accuracy lessons from a user-supplied Kuwait plate with stencil digits and separate series and registration areas.
---

Do not assume grayscale conversion, arbitrary resizing, or forcing a tightly framed plate to a fixed aspect ratio improves recognition.

**Why:** On a clear user-supplied Kuwait plate, grayscale and small crop/aspect changes reduced recognition confidence and introduced an extra digit. Retaining the original colour detail and aspect ratio, with integer upscaling, gave better results. A numeric whitelist alone also turned country text into spurious digits.

**How to apply:** Compare changes against representative images through the actual browser Canvas/Tesseract path, not just text-parser tests. Keep the series and registration number together as the identifier, exclude country labels spatially, and require manual correction when either group is uncertain. One successful sample is not evidence that every Kuwait plate layout or camera angle is supported.
