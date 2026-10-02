# Smart Capture Web SDK

## Summary

This document provides an overview of GBG's Smart Capture Web SDK and demonstrates its advanced features and capabilities. The SDK includes a set of smart tools and components that streamline the capture process for identity documents and face images, and enhances the user experience.

## Features

* ### Smart capture of Identity Documents
  * **Document detection:** The SDK can identify and locate identity documents with high precision.
  * **Real-Time analysis:** Evaluates sharpness and glare against metrics and provides immediate feedback.
  * **User guidance:** Offers instant instructions to help users resolve any issues during document capture.
* ### Smart capture of face images
  * **Face detection:** Identifies the presence of a user's face in the camera view.
  * **Live feedback:** Offers on-screen suggestions to guide users to correctly position their face.
  * **Automated capture:** Automatically initiates capture once the face is accurately positioned.

## Technical Features

* **Dynamic import:** Provides a range of exported functions and classes for seamless integration.
* **Low-Code integration:** Includes Document and Face Camera components as custom HTML elements, enabling effortless integration by simply adding them to your DOM tree.
* **TypeScript compatibility:** Includes full TypeScript mapping for all objects and functions.
* **NPM distribution:** Distributed as an NPM package hosted on AWS CodeArtifact for easy access and deployment.

## Installation Steps
### Prerequisites
Before you begin, ensure that you have access to the `gbgplc-smartcapture-web-vX.Y.Z.zip` file and the password provided for extraction.

### Main Installation Steps
1. Extract the `zip` file:
  * Download and unzip the `gbgplc-smartcapture-web-vX.Y.Z.zip` file using the provided password.
  * To extract via command line:
    * Windows:
      ```bash
      Expand-Archive -Path "path\to\gbgplc-smartcapture-web-vX.Y.Z.zip" -DestinationPath "path\to\output\directory"
      ```
    * Linux:
      ```bash
      unzip path/to/gbgplc-smartcapture-web-vX.Y.Z.zip -d path/to/output/directory
      ```
    * macOS:
      ```bash
      unzip path/to/gbgplc-smartcapture-web-vX.Y.Z.zip -d path/to/output/directory
      ```
  * Enter the password when prompted.
2. Locate and place the `tar` file:
  * After extracting, locate `gbgplc-smartcapture-web-vX.Y.Z.tar` in the output directory.
  * Move `gbgplc-smartcapture-web-vX.Y.Z.tar` to the root directory of your project.
3. Install as a Local Dependency:
    ```bash
    npm install ./gbgplc-smartcapture-web-vX.Y.Z.tar
    ```

## Documentation

For more details, please visit our [SDK Docs](https://smartcapture-demo.idscan.cloud/demo/sdk-docs/index.html)
