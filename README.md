# Fresh & Fold

### Smarter garment care, from scan to doorstep.

Fresh & Fold is a laundry and garment-care platform that connects AI-assisted garment analysis and conversational booking with a complete laundry service workflow.

The idea behind Fresh & Fold is simple: people don't always know exactly what their clothes need. A customer may have a stain they can't identify, a fabric they're unsure about, or a care label they don't understand. Even when they know what service they want, creating a laundry order can still involve manually selecting every item, quantity, service, and pickup preference.

Fresh & Fold brings these experiences together. Customers can use AI-assisted garment-care features, create bookings through voice or natural language, schedule pickups, review pricing, make payments, track their orders, and contact support.

On the business side, a separate Admin Dashboard helps the laundry team manage orders, update fulfillment status, monitor operations, and communicate with customers.

---

# Demo Credentials

The following credentials are provided for hackathon judging and testing.

## Customer Mobile App

| Field         | Demo Credential |
| ------------- | --------------- |
| Mobile Number | `9876543210`    |
| OTP           | `123456`        |

### How to Sign In

1. Open the Fresh & Fold mobile application.
2. Enter the mobile number `9876543210`.
3. Continue to OTP verification.
4. Enter the OTP `123456`.
5. After verification, you will be signed in to the demo customer account.

> This is a shared evaluation account. Please avoid entering personal or sensitive information while testing the application.

---

## Admin Dashboard

| Field    | Demo Credential  |
| -------- | ---------------- |
| Email    | `test@gmail.com` |
| Password | `test1234`       |

### How to Sign In

1. Open the deployed Fresh & Fold Admin Dashboard.
2. Enter `test@gmail.com`.
3. Enter the password `test1234`.
4. Sign in to access the administrative interface.

The demo account allows judges to explore the operational side of Fresh & Fold, including order management, fulfillment updates, analytics, and customer support.

> These credentials are intended only for hackathon evaluation. No production credentials or API secrets are included in this repository.

---

# What Fresh & Fold Does

Fresh & Fold connects AI-assisted garment care with the actual laundry service journey.

The customer experience includes:

* AI-assisted garment recognition
* Fabric detection
* Stain analysis
* Care-label understanding
* Garment-care guidance
* AI and voice-assisted booking
* Manual laundry booking
* Service and speed selection
* Pickup scheduling
* Pricing
* Razorpay payment integration
* Order tracking
* Real-time order updates
* Customer support

The platform also includes an Admin Dashboard for managing the operational side of the service.

The complete customer journey is:

**Understand your clothes → Create a request → Review → Book → Schedule → Pay → Track → Get support**

Our goal was not to build several unrelated AI demonstrations. We wanted the AI functionality to exist inside a complete product where the customer can move from understanding a garment to actually booking and managing a laundry service.

---

# AI Care

AI Care focuses on questions customers may have about their clothes before or during the laundry process.

## Garment Recognition

Users can provide a garment image and receive assistance identifying the type of clothing.

## Fabric Detection

Fresh & Fold can analyze clothing material and provide information about the detected or likely fabric.

## Stain Analysis

Users can provide an image containing a visible stain and receive information and relevant care guidance.

## Care-Label Intelligence

Fresh & Fold can help users understand the information and symbols found on garment care labels.

## Garment-Care Guidance

The AI Care experience provides relevant information based on the available garment analysis.

AI-generated information is treated as guidance. The purpose of AI Care is to help customers make more informed decisions, not to present model output as guaranteed professional textile-care advice.

---

# AI and Voice-Assisted Booking

Fresh & Fold allows customers to describe their laundry request naturally instead of manually entering every detail from the beginning.

For example:

> "I want two shirts and three pants washed with express service."

The system can interpret relevant information from the request, including:

* Items
* Quantities
* Service preferences
* Speed preferences
* Scheduling information

The result is converted into a structured booking draft.

We intentionally designed this as a **draft** rather than allowing AI to directly create an order. The customer can review and correct the interpreted information before continuing through the normal booking workflow.

This creates a clear boundary between AI assistance and application control.

**AI interprets the request.**

**The customer reviews it.**

**The application handles the transaction.**

---

# Booking and Payment

After reviewing the booking details, customers can continue through the standard Fresh & Fold booking process.

The flow includes:

1. Review selected items and quantities.
2. Confirm the required services.
3. Select the service speed.
4. Choose pickup details.
5. Review the calculated price.
6. Continue to payment.
7. Complete payment through Razorpay.
8. Receive the created order.

Pricing is handled through controlled application logic rather than treating AI-generated or arbitrary client-supplied totals as authoritative.

Payment handling is also connected to the backend workflow rather than relying only on client-side payment state.

---

# Order Tracking

Once an order is confirmed, customers can view it from the Orders section of the mobile application.

The tracking experience allows customers to follow the order as it moves through the available stages of the laundry fulfillment process.

---

# Real-Time Updates

Fresh & Fold uses Socket.IO for real-time communication between relevant parts of the system.

When the laundry team updates an order through the Admin Dashboard, the customer-facing application can receive the corresponding update without requiring the customer and business workflows to operate as completely disconnected systems.

Socket.IO is also used as part of the real-time customer support experience.

---

# Customer Support

Customers can contact support directly through the mobile application.

On the business side, the laundry team can view and respond to customer conversations through the Admin Dashboard.

This keeps customer communication connected to the same platform used to manage the laundry service.

---

# Admin Dashboard

Fresh & Fold includes a separate web-based Admin Dashboard for the operational side of the platform.

The dashboard allows the laundry team to:

* View incoming orders
* Manage existing orders
* Update order fulfillment status
* Monitor operational information
* View available analytics
* Handle customer support

The Admin Dashboard and customer application work with the same broader platform, connecting what the customer sees with what is happening on the operational side of the service.

---

# Recommended Testing Flow for Judges

The following flow provides the quickest way to experience the main features of Fresh & Fold.

## 1. Sign In

Use the demo customer credentials:

**Mobile Number:** `9876543210`

**OTP:** `123456`

---

## 2. Explore AI Care

Open AI Care and test one or more available capabilities.

For best results, try:

* A clear image of a garment
* A close-up image showing fabric texture
* A garment with a clearly visible stain
* A readable garment care label

AI results can vary depending on image quality, lighting, and how clearly the relevant garment, stain, fabric, or label is visible.

---

## 3. Try AI / Voice Booking

Open the AI or voice-assisted booking experience.

Try a request such as:

> "I want two shirts and three pants washed with express service."

Review the booking information interpreted by the system.

Check the detected items, quantities, service, and speed before continuing.

If anything is incorrect, edit the booking draft before moving forward.

---

## 4. Continue the Booking

Continue through the standard booking flow.

Select the required pickup details and review the calculated price.

---

## 5. Complete the Test Payment

Continue to the Razorpay payment flow.

The hackathon demo environment should use Razorpay Test Mode for evaluation.

Complete the test transaction and return to Fresh & Fold.

---

## 6. Track the Order

Open the Orders section and locate the newly created order.

Open the order to view its current status and tracking information.

---

## 7. Open the Admin Dashboard

Sign in using:

**Email:** `test@gmail.com`

**Password:** `test1234`

Locate the order created through the customer application.

---

## 8. Update the Order

Use the Admin Dashboard to update the order through the available fulfillment stages.

Observe the corresponding status in the customer application.

This demonstrates the connection between the customer experience and the operational side of Fresh & Fold.

---

## 9. Test Customer Support

Send a test message from the mobile application.

Open the support section of the Admin Dashboard and locate the corresponding conversation.

Reply from the Admin Dashboard and observe the customer-side experience.

---

# Tech Stack

## Mobile Application

* React Native
* Expo
* Expo Router

## Backend

* Node.js
* Express

## Database

* MongoDB
* Mongoose

## Admin Dashboard

* React
* Vite

## Real-Time Communication

* Socket.IO

## Authentication

* OTP-based customer authentication
* JWT-based authenticated sessions
* Separate Admin authentication

## Payments

* Razorpay

## AI Capabilities

AI integrations are used for:

* Garment recognition
* Fabric analysis
* Stain analysis
* Care-label intelligence
* Garment-care guidance
* Natural-language booking
* Voice-assisted booking

---

# How We Used Codex with GPT-5.6

Codex with GPT-5.6 played an important role throughout the development of Fresh & Fold.

We used it across the mobile application, backend, AI workflows, and Admin Dashboard. Because Fresh & Fold is made up of several connected systems, many of the problems we encountered could not be solved by changing a single file.

Codex helped us inspect the existing codebase, understand how different parts of the application interacted, plan changes across multiple files, implement features, investigate bugs, and review completed functionality.

We did not use Codex simply to generate isolated pieces of code. It became part of an iterative development process:

**Understand the requirement → Inspect the existing implementation → Plan the change → Implement → Test → Audit → Fix what remains**

This workflow was particularly useful as Fresh & Fold grew and individual features began interacting with multiple parts of the system.

---

## Cross-Codebase Development

Fresh & Fold includes a React Native mobile application, a Node.js and Express backend, MongoDB persistence, AI workflows, Socket.IO communication, payment integration, and a React/Vite Admin Dashboard.

Codex with GPT-5.6 helped us reason across these boundaries.

For features that required coordinated changes, we used Codex to understand how modifications in one part of the project could affect another rather than treating each application as an isolated codebase.

---

## Real-Time Socket.IO Debugging

One of the clearest examples was real-time synchronization.

At one stage of development, order-status updates and support messages were not always propagating correctly between the Admin Dashboard and mobile application.

The issue crossed several parts of the system: the Admin Dashboard, Socket.IO connection lifecycle, backend event handling, and mobile-side listeners.

Codex helped us trace that complete event flow and investigate issues involving connection management and event listeners.

This allowed us to approach the problem as a cross-system synchronization issue rather than assuming it was simply a frontend bug.

---

## AI and Voice Booking

Codex with GPT-5.6 was also used while developing and improving the AI-assisted booking experience.

Turning a natural-language or spoken request into a working booking involves more than extracting text.

The system needs to understand items, quantities, services, and speed preferences, then map that information to the actual booking structure used by Fresh & Fold.

During testing, we also encountered cases where speech recognition could interpret words such as "two" as "to" or "four" as "for."

Codex helped us iterate on the booking workflow, investigate these edge cases, and connect the AI-generated result to an editable booking draft rather than allowing uncertain AI output to directly create an order.

---

## AI Care Development

We also used Codex while implementing and reviewing the AI Care workflows.

AI responses are not always predictable. Results can depend on image quality, lighting, the visibility of a stain, fabric texture, or the readability of a care label.

During development, we tested AI outputs, investigated inconsistent behavior, and worked on validation, error handling, and fallback scenarios.

Codex helped us reason through these workflows and review how AI-generated information moved through the rest of the application.

---

## Implementation Audits

One of the most useful ways we used Codex was for implementation audits.

After completing major features, we did not assume they were finished simply because the code compiled or the main happy path worked.

We used Codex to compare the existing implementation against our intended requirements and inspect the relevant parts of the codebase.

These audits helped us find incomplete integrations, edge cases, and behavior that needed another iteration.

We then used those findings to continue improving the implementation.

---

## Debugging and Iteration

Codex with GPT-5.6 also supported our debugging workflow across areas such as:

* Mobile and backend integration
* API behavior
* AI workflow validation
* Voice-assisted booking
* Real-time order synchronization
* Customer support communication
* Authentication flows
* Payment-related application logic
* Deployment and environment configuration

The main benefit was being able to move more quickly between identifying a problem, understanding where it originated, implementing a change, and reviewing the result.

---

# Key Decisions Remained Ours

Codex accelerated our implementation and debugging process, but the final product and architecture decisions remained ours.

Some of the important decisions we made were:

* AI output should be advisory rather than automatically authoritative.
* Customers should be able to review AI-generated booking information.
* AI should not independently authorize payments or create final transactional state.
* Pricing should remain under controlled application logic.
* Payment state should be verified through the application workflow.
* Customer and Admin access should remain separated.
* Order status should follow a controlled fulfillment lifecycle.
* AI workflows should account for incorrect, incomplete, or unavailable responses.

Our goal was to use AI where interpretation is useful while keeping critical application behavior predictable.

---

# What Codex with GPT-5.6 Changed for Our Workflow

The biggest benefit of Codex was not simply generating code faster.

It helped shorten the cycle between having an idea and understanding what it would take to make that idea work across an existing codebase.

Instead of using it only at the beginning of implementation, we continued using Codex throughout the development cycle—for implementation, debugging, testing, reviewing, and auditing.

For Fresh & Fold, that was especially valuable because the final product depends on several systems working together.

A feature may begin in the mobile application, pass through the backend, interact with the database or an external service, and then affect the Admin Dashboard.

Codex with GPT-5.6 helped us reason about those connections while we remained responsible for deciding how the product should ultimately behave.

---

# Architecture

At a high level, Fresh & Fold consists of:

```text
Customer Mobile App
        |
        | REST API
        v
Node.js / Express Backend
        |
        |------ MongoDB
        |
        |------ AI Services
        |
        |------ Razorpay
        |
        |------ Socket.IO
                    |
                    v
             Admin Dashboard
```

The mobile application provides the customer experience.

The backend handles application logic and connects the different services.

MongoDB provides persistent storage.

AI services support garment-care analysis and conversational booking.

Razorpay supports the payment flow.

Socket.IO connects relevant real-time experiences.

The Admin Dashboard provides the operational interface for the laundry business.

---

# Key Engineering Principle

One principle guided how we integrated AI into Fresh & Fold:

> **Use AI for interpretation, but keep critical operations under controlled application logic.**

AI can help understand a garment.

AI can help analyze a stain.

AI can help interpret what a customer says.

But the customer should still be able to review uncertain information, and operations such as pricing and payments should not depend entirely on a model response.

This separation helped us build AI into the product without making the entire application dependent on AI being correct every time.

---

# Known Limitations

Fresh & Fold is currently a hackathon project implementation rather than a live commercial laundry operation.

Some features depend on external AI, payment, authentication, and hosting services. Their availability or rate limits may affect individual functionality during testing.

AI results may also vary depending on:

* Image quality
* Lighting
* Visibility of the garment or stain
* Care-label readability
* Speech-recognition accuracy
* Ambiguity in natural-language requests
* AI provider availability

AI-generated garment-care information should therefore be treated as guidance rather than guaranteed professional textile-care advice.

A production deployment would require broader testing with real customers and laundry operators, production authentication infrastructure, live payment onboarding, monitoring, and further validation of AI functionality across a wider variety of garments, fabrics, stains, and care labels.

---

# Security Notes

* Demo credentials are provided specifically for hackathon evaluation.
* Real production API keys and secrets are not included in this README.
* Application secrets should be stored using environment variables.
* Razorpay should remain in Test Mode for evaluator testing.
* Shared demo accounts should not be used to submit sensitive or personal information.

The repository should never publicly expose:

* MongoDB credentials
* JWT secrets
* Razorpay secret keys
* AI provider API keys
* OTP/SMS provider credentials
* Webhook secrets
* Production Admin credentials

---

# What's Next

The next step for Fresh & Fold is to test the platform with real customers and an actual laundry operation.

We would like to improve AI Care across a wider range of garments, fabrics, stains, and care labels, continue improving voice-assisted booking, add production-ready notifications and authentication, and expand the operational tools available to laundry businesses.

Most importantly, we want future development to be guided by real usage.

Fresh & Fold started with a simple idea: use AI to make the uncertain parts of laundry easier while building a reliable system to handle everything that comes next.

---

# Hackathon

Fresh & Fold was built and iterated using **Codex with GPT-5.6**.

Codex was used throughout the project's implementation, debugging, cross-codebase reasoning, testing, auditing, and iteration workflow.

The required Codex `/feedback` Session ID is provided separately through the official hackathon submission.

---

# Quick Judge Reference

## Customer Demo

**Mobile Number:** `9876543210`

**OTP:** `123456`

## Admin Demo

**Email:** `test@gmail.com`

**Password:** `test1234`

---

# Fresh & Fold

**Smarter garment care, from scan to doorstep.**
