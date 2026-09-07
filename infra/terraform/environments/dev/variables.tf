variable "project_id" {
  description = "GCP project ID for the dev environment"
  type        = string
}

variable "region" {
  description = "Firestore location"
  type        = string
  default     = "asia-northeast1"
}
