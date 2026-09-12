terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 6.0"
    }
  }
}

# The stack is backendless, so the Cloud Functions and Cloud Build APIs stay disabled.
resource "google_project_service" "services" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "firebaserules.googleapis.com",
    "firebasehosting.googleapis.com",
    "identitytoolkit.googleapis.com",
    "storage.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.services]
}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Security Rules and composite indexes are managed by `firebase deploy`
  # rather than Terraform (see the README).
  depends_on = [google_project_service.services]
}

resource "google_firebase_web_app" "default" {
  provider     = google-beta
  project      = var.project_id
  display_name = var.web_app_display_name

  depends_on = [google_firebase_project.default]
}

data "google_firebase_web_app_config" "default" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.default.app_id
}

# Firebase Authentication, with email + password as the only enabled provider.
resource "google_identity_platform_config" "default" {
  project = var.project_id

  sign_in {
    email {
      enabled           = true
      password_required = true
    }
  }

  depends_on = [google_project_service.services]
}

# Supporting document files (証憑). One bucket, in the same region as Firestore. Object
# versioning keeps every version of an object even though the Storage rules
# never allow an overwrite or a delete, as a second line of defense for the
# retention the 電子帳簿保存法 requires. Access is governed by storage.rules,
# deployed with `firebase deploy` like the Firestore rules.
resource "google_storage_bucket" "supportingDocuments" {
  project  = var.project_id
  name     = "${var.project_id}-supportingDocuments"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  depends_on = [google_project_service.services]
}

resource "google_firebase_storage_bucket" "supportingDocuments" {
  provider  = google-beta
  project   = var.project_id
  bucket_id = google_storage_bucket.supportingDocuments.id

  depends_on = [google_firebase_project.default]
}
