terraform {
  required_version = ">= 1.5"

  # A backend block cannot reference variables, so inject the bucket name with
  # `terraform init -backend-config="bucket=..."` (see the README).
  # To validate without credentials, use `terraform init -backend=false`.
  backend "gcs" {
    prefix = "account-ledgers/dev"
  }

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

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

module "firebase" {
  source = "../../modules/firebase"

  project_id           = var.project_id
  region               = var.region
  web_app_display_name = "account-ledgers (dev)"
}
