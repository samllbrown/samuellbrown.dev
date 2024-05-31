---
title: Augmented Reality in Android
publishDate: 2020-03-04 00:00:00
img: /assets/wikitude.png
img_alt: Wikitude on an android phone
description: |
  Very early use-case of mobile augmented reality technology 
tags:
  - Augmented Reality
  - Android Applications
  - Multiplatform
---

## Background

During my work at Wildgoose, there was an initiative to expand the products to include features like augmented reality. The concept is that you would be walking to a GPS location, and you would be able to use your phone's camera to see a live 3D object. For example, if you were at a landmark, it could display text explaining more information, or if you had trouble getting to the location, it could show you an arrow to guide you there. One of the really cool things about this type of technology is that you could anchor an object to a GPS location, meaning as long as your phone had a good signal, it would be extremely accurate.

## Implementing Augmented Reality

To implement augmented reality (AR) in our Android application, we used the Wikitude AR platform. Wikitude provided robust tools and SDKs to create AR experiences that were both engaging and reliable. Additionally, we leveraged Android's native GPS and camera APIs to integrate AR functionalities seamlessly into the app.

### Developing AR Features

1. **GPS Integration**: The first step was integrating GPS to accurately detect the user's location. By utilizing Android's Location Services, we ensured that the app could determine the user's position with high accuracy.
2. **Overlaying 3D Objects**: We used Wikitude's SDK to overlay 3D objects onto the camera view. This involved creating 3D models and anchoring them to specific GPS coordinates. When users pointed their cameras at these locations, the models would appear in real-time.
3. **Displaying Information**: To provide users with relevant information about landmarks, we implemented text overlays. These overlays were triggered when the user was in proximity to a landmark, providing historical data, facts, and other useful details.
4. **Navigation Assistance**: One of the most practical applications of AR in our project was providing navigation assistance. By integrating AR arrows that pointed towards the destination, users could easily find their way to specific locations, enhancing the overall user experience.

## Challenges and Solutions

### Performance Optimization

AR applications can be resource-intensive, impacting the performance of the app. To address this, we optimized the 3D models and used efficient rendering techniques. We also made sure to manage memory usage effectively, preventing the app from slowing down or crashing.

### User Experience

Ensuring a smooth and intuitive user experience was crucial. We conducted extensive user testing to gather feedback and made iterative improvements to the interface. This included adjusting the sensitivity of the AR overlays and refining the user prompts to make interactions more intuitive.
