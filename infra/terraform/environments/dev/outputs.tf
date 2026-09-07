output "web_app_id" {
  value = module.firebase.web_app_id
}

output "web_api_key" {
  value     = module.firebase.web_api_key
  sensitive = true
}

output "auth_domain" {
  value = module.firebase.auth_domain
}
