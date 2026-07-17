# Feature Status Matrix

| Feature | Status | Quality | Notes |
| --- | --- | --- | --- |
| Mobile OTP login | Complete | Good | MSG91 or local fallback; needs rate limiting. |
| OTP verification | Complete | Good | JWT issued; local OTP storage/logging should be hardened. |
| Auth persistence | Complete | Good | AsyncStorage token and unauthorized logout handler. |
| Admin login | Complete | Good | Bcrypt/JWT. |
| Admin password reset | Partial | Fair | Static reset key; no email/token flow. |
| Admin registration | Exists | Risky | Public endpoint, not used by UI. |
| Service selection | Complete | Good | Static service catalog. |
| Item selection | Complete | Good | Static item/pricing catalog. |
| Pricing preview | Complete | Good | Backend source of truth, but duplicated mobile constants. |
| Scheduling | Partial | Fair | UI exists, but schedule is not persisted on Order. |
| Address list/create/update | Complete | Good | No delete/default/serviceability. |
| Map/location address capture | Partial | Good | Rich UI, no backend geocoding/service area rules. |
| Razorpay payment | Complete | Good | Signature verification and order token. |
| Mock payments | Complete | Useful | Config-driven backend support. |
| Failed payment logging | Complete | Fair | Duplicate endpoints and only failed model. |
| Order creation | Complete | Good | Requires payment verification token. |
| Order history | Complete | Good | No pagination/filtering. |
| Order tracking | Complete | Good | Socket updates; no single-order API. |
| Reorder | Partial | Fair | Mobile route flow exists from history. |
| Push notifications | Partial | Fair | Token save and status push; limited notification management. |
| Mobile profile | Partial | Fair | Mostly local; backend lacks profile model fields. |
| Edit profile | Partial | Weak | Not backed by User schema. |
| Live rider tracking | Prototype | Weak | Simulated only. |
| Customer support bot | Complete | Fair | Rule-based deterministic assistant, not LLM-backed. |
| Support escalation | Complete | Good | Ticket creation/upsert and active ticket flow. |
| Support live chat | Complete | Good | Socket ticket rooms and admin/user messages. |
| Support SLA tracking | Complete | Good | Due dates, response/resolution metrics. |
| Admin dashboard | Complete | Good | Strong operational overview. |
| Admin order management | Complete | Good | Status updates and simulation; no pagination. |
| Admin support management | Complete | Good | Ticket list, status, replies, analytics. |
| Admin analytics | Partial | Good | Support/revenue basics; lacks filters and server aggregates. |
| User management | Missing | N/A | No admin user/customer page. |
| Catalog/pricing management | Missing | N/A | Static code constants. |
| Refunds/cancellations | Missing | N/A | Not modeled. |
| Tests | Missing | N/A | No test suite found. |
| AI garment recognition | Missing | N/A | No upload/storage/vision pipeline. |
| AI stain detection | Missing | N/A | No image pipeline. |
| AI fabric identification | Missing | N/A | No image pipeline. |
| AI care label reader | Missing | N/A | No OCR pipeline. |
| AI natural language booking | Missing/Partial foundation | Fair | Support intent code exists but booking APIs are not NL-ready. |

