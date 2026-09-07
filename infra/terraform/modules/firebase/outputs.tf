output "web_app_id" {
  description = "ID of the Firebase web app"
  value       = google_firebase_web_app.default.app_id
}

output "web_api_key" {
  description = "API key of the web app (NEXT_PUBLIC_FIREBASE_API_KEY)"
  value       = data.google_firebase_web_app_config.default.api_key
  sensitive   = true
}

output "auth_domain" {
  description = "Auth domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)"
  value       = data.google_firebase_web_app_config.default.auth_domain
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.default.name
}
