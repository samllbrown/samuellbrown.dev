---
title: JSONater
publishDate: 2020-03-02 00:00:00
img: /assets/json.png
img_alt: n/a
description: |
  JSONater is an internal tool I designed and developed to reduce development time by converting Excel data into JSON.
tags:
  - Excel to JSON
  - Kotlin Multiplatform
  - Development Efficiency
---

## The problem

*As this is a currently used tool, some parts will be taken out for privacy reasons.*

Often, in products, there is a need to generate or modify large amounts of preexisting JSON data. Initially, we created varying amounts of JSON manually, which was manageable until we needed to generate it from scratch. This JSON had to be in a specific format, with different options depending on the data provided in an Excel spreadsheet.

## Solution

When designing JSONater, the main requirement was that it had to be multiplatform, as our company uses both Windows and Mac systems for product development. While this project could have been implemented with carefully crafted Excel macros or any scripting language, I wanted it to be usable out of the box and to have a small UI. Therefore, I chose Kotlin for its multiplatform capabilities, specifically targeting a desktop environment.

I really enjoyed learning about Kotlin Multiplatform and I'm really excited to see how far it can be adopted. I think there is plenty of room for growth, and I feel most companies should and will convert their legacy java projects into Kotlin. I don't think there is many reasons to start a new product in Java. 
