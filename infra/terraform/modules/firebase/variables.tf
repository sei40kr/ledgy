variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Firestore location"
  type        = string
  default     = "asia-northeast1"
}

variable "web_app_display_name" {
  description = "Display name of the Firebase web app"
  type        = string
}
