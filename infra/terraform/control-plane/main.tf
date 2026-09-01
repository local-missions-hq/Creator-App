locals {
  retained_inventory = [
    "remote-state-and-locking",
    "github-azure-oidc-identities",
    "entra-external-id-registrations",
    "stable-domain-and-verification-dns",
    "subscription-budgets-alerts-and-policy",
  ]

  required_tags = {
    application      = "local-missions"
    application_code = "lm"
    environment      = "control-plane"
    lifecycle        = "retained"
    managed_by       = "terraform"
    owner            = var.owner
    purpose          = "rebuild-and-cleanup-control-plane"
    region           = var.location
    terraform_root   = "control-plane"
  }

  landing_zone_tags = {
    application      = "local-missions"
    application_code = "lm"
    environment      = "development"
    lifecycle        = "retained-boundary"
    managed_by       = "terraform"
    owner            = var.owner
    purpose          = "least-privilege-workload-landing-zone"
    region           = var.location
    terraform_root   = "control-plane"
  }

  identity_names = {
    plan    = "id-local-missions-tf-plan-dev-eus2-001"
    apply   = "id-local-missions-tf-apply-dev-eus2-001"
    destroy = "id-local-missions-tf-destroy-dev-eus2-001"
  }

  environment_names = {
    plan    = "azure-development-plan"
    apply   = "azure-development-apply"
    destroy = "azure-development-destroy"
  }

  state_backend_role_assignments = {
    plan    = "plan"
    apply   = "apply"
    destroy = "destroy"
  }

  state_container_scope = "/subscriptions/${var.expected_subscription_id}/resourceGroups/${var.state_resource_group_name}/providers/Microsoft.Storage/storageAccounts/${var.state_storage_account_name}/blobServices/default/containers/${var.state_container_name}"

  delegated_workload_role_definition_ids = [
    "4633458b-17de-408a-b874-0445c86b69e6", # Key Vault Secrets User
    "4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0", # Azure Service Bus Data Receiver
    "69a216fc-b8fb-44d8-bc22-1f3c2cd27a39", # Azure Service Bus Data Sender
    "7f951dda-4ed3-4680-a7ca-43fe172d538d", # AcrPull
    "ba92f5b4-2d11-453d-a403-e96b0029c9fe", # Storage Blob Data Contributor
  ]

  delegated_workload_role_condition = "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR (@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {${join(", ", local.delegated_workload_role_definition_ids)}} AND @Request[Microsoft.Authorization/roleAssignments:PrincipalType] ForAnyOfAnyValues:StringEqualsIgnoreCase {'ServicePrincipal'})) AND ((!(ActionMatches{'Microsoft.Authorization/roleAssignments/delete'})) OR (@Resource[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {${join(", ", local.delegated_workload_role_definition_ids)}} AND @Resource[Microsoft.Authorization/roleAssignments:PrincipalType] ForAnyOfAnyValues:StringEqualsIgnoreCase {'ServicePrincipal'}))"

  workload_role_definitions = {
    apply = {
      id          = "1e57cd73-5573-406d-9642-17cfcbbba237"
      name        = "Local Missions Dev Workload Deployer"
      description = "Creates and updates Local Missions development resources without delete or access-management authority."
      actions = [
        "Microsoft.App/*",
        "Microsoft.Authorization/*/read",
        "Microsoft.ContainerRegistry/*",
        "Microsoft.DBforPostgreSQL/*",
        "Microsoft.Insights/*",
        "Microsoft.KeyVault/*",
        "Microsoft.ManagedIdentity/*",
        "Microsoft.OperationalInsights/*",
        "Microsoft.ResourceHealth/availabilityStatuses/read",
        "Microsoft.Resources/deployments/*",
        "Microsoft.Resources/subscriptions/resourceGroups/read",
        "Microsoft.Resources/subscriptions/resourceGroups/resources/read",
        "Microsoft.Resources/tags/*",
        "Microsoft.ServiceBus/*",
        "Microsoft.Storage/*",
      ]
      not_actions = [
        "*/delete",
        "Microsoft.Authorization/*/write",
        "Microsoft.Authorization/*/delete",
        "Microsoft.Resources/subscriptions/resourceGroups/delete",
      ]
    }
    destroy = {
      id          = "7724a7af-466e-4f89-897c-2c5946cf5920"
      name        = "Local Missions Dev Workload Destroyer"
      description = "Reads and deletes stamped Local Missions development resources without deleting the retained landing zone."
      actions = [
        "*/read",
        "*/delete",
      ]
      not_actions = [
        "Microsoft.Authorization/*/delete",
        "Microsoft.Resources/subscriptions/resourceGroups/delete",
      ]
    }
  }

  workflow_role_assignments = {
    plan_reader = {
      identity     = "plan"
      builtin_role = "Reader"
      custom_role  = null
      condition    = null
    }
    apply_deployer = {
      identity     = "apply"
      builtin_role = null
      custom_role  = "apply"
      condition    = null
    }
    apply_rbac = {
      identity     = "apply"
      builtin_role = "Role Based Access Control Administrator"
      custom_role  = null
      condition    = local.delegated_workload_role_condition
    }
    destroy_deleter = {
      identity     = "destroy"
      builtin_role = null
      custom_role  = "destroy"
      condition    = null
    }
    destroy_rbac = {
      identity     = "destroy"
      builtin_role = "Role Based Access Control Administrator"
      custom_role  = null
      condition    = local.delegated_workload_role_condition
    }
  }
}

data "azurerm_client_config" "current" {
  count = var.azure_resource_creation_enabled ? 1 : 0
}

resource "azurerm_resource_group" "control" {
  count = var.azure_resource_creation_enabled ? 1 : 0

  name     = var.control_plane_resource_group_name
  location = var.location
  tags     = local.required_tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_resource_group" "workload_landing_zone" {
  count = var.azure_resource_creation_enabled ? 1 : 0

  name     = var.workload_landing_zone_resource_group_name
  location = var.location
  tags     = local.landing_zone_tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_user_assigned_identity" "terraform" {
  for_each = var.azure_resource_creation_enabled ? local.identity_names : {}

  name                = each.value
  resource_group_name = var.control_plane_resource_group_name
  location            = var.location
  tags                = local.required_tags

  lifecycle {
    prevent_destroy = true
  }

  depends_on = [azurerm_resource_group.control]
}

resource "azurerm_federated_identity_credential" "github" {
  for_each = var.azure_resource_creation_enabled ? local.environment_names : {}

  name                      = "fic-gh-${each.key}-dev"
  user_assigned_identity_id = azurerm_user_assigned_identity.terraform[each.key].id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = "https://token.actions.githubusercontent.com"
  subject                   = var.github_oidc_subjects[each.key]

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_role_definition" "workload" {
  for_each = var.azure_resource_creation_enabled ? local.workload_role_definitions : {}

  role_definition_id = each.value.id
  name               = each.value.name
  scope              = azurerm_resource_group.workload_landing_zone[0].id
  description        = each.value.description

  permissions {
    actions          = each.value.actions
    not_actions      = each.value.not_actions
    data_actions     = []
    not_data_actions = []
  }

  assignable_scopes = [azurerm_resource_group.workload_landing_zone[0].id]

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_role_assignment" "workflow" {
  for_each = var.azure_resource_creation_enabled ? local.workflow_role_assignments : {}

  scope                            = azurerm_resource_group.workload_landing_zone[0].id
  role_definition_name             = each.value.builtin_role
  role_definition_id               = each.value.custom_role == null ? null : azurerm_role_definition.workload[each.value.custom_role].role_definition_resource_id
  principal_id                     = azurerm_user_assigned_identity.terraform[each.value.identity].principal_id
  principal_type                   = "ServicePrincipal"
  description                      = "Retained Local Missions ${each.key} workload boundary"
  condition                        = each.value.condition
  condition_version                = each.value.condition == null ? null : "2.0"
  skip_service_principal_aad_check = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_role_assignment" "state_backend" {
  for_each = var.azure_resource_creation_enabled ? local.state_backend_role_assignments : {}

  scope                            = local.state_container_scope
  role_definition_name             = "Storage Blob Data Contributor"
  principal_id                     = azurerm_user_assigned_identity.terraform[each.value].principal_id
  principal_type                   = "ServicePrincipal"
  description                      = "Retained Local Missions ${each.key} Terraform state access"
  skip_service_principal_aad_check = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_monitor_action_group" "cost" {
  count = var.azure_resource_creation_enabled ? 1 : 0

  name                = "ag-local-missions-dev-cost-001"
  resource_group_name = var.control_plane_resource_group_name
  short_name          = "lmdevcost"
  tags                = local.required_tags

  email_receiver {
    name                    = "accountable-cost-owner"
    email_address           = var.alert_receiver_email
    use_common_alert_schema = true
  }

  lifecycle {
    prevent_destroy = true
  }

  depends_on = [azurerm_resource_group.control]
}

resource "azurerm_consumption_budget_subscription" "development" {
  count = var.azure_resource_creation_enabled ? 1 : 0

  name            = "budget-local-missions-dev-100"
  subscription_id = "/subscriptions/${var.expected_subscription_id}"
  amount          = var.approved_monthly_budget_usd
  time_grain      = "Monthly"

  time_period {
    start_date = var.budget_start_date
    end_date   = var.budget_end_date
  }

  filter {
    tag {
      name     = "application"
      operator = "In"
      values   = ["local-missions"]
    }
  }

  dynamic "notification" {
    for_each = {
      actual-050   = { threshold = 50, threshold_type = "Actual" }
      actual-080   = { threshold = 80, threshold_type = "Actual" }
      actual-100   = { threshold = 100, threshold_type = "Actual" }
      forecast-050 = { threshold = 50, threshold_type = "Forecasted" }
      forecast-080 = { threshold = 80, threshold_type = "Forecasted" }
      forecast-100 = { threshold = 100, threshold_type = "Forecasted" }
    }
    content {
      enabled        = true
      threshold      = notification.value.threshold
      operator       = "GreaterThanOrEqualTo"
      threshold_type = notification.value.threshold_type
      contact_groups = [azurerm_monitor_action_group.cost[0].id]
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

check "retained_scope_is_explicit" {
  assert {
    condition = (
      var.control_plane_resource_group_name != var.state_resource_group_name &&
      var.workload_landing_zone_resource_group_name != var.control_plane_resource_group_name &&
      var.workload_landing_zone_resource_group_name != var.state_resource_group_name &&
      !strcontains(lower(var.control_plane_resource_group_name), "workload") &&
      !strcontains(lower(var.state_resource_group_name), "workload") &&
      !strcontains(lower(var.workload_landing_zone_resource_group_name), "rg-pp")
    )
    error_message = "Retained control, state, and Local Missions workload landing-zone scopes must be explicit, distinct, and must never target another project."
  }
}

check "provider_scope_matches_reviewed_account" {
  assert {
    condition = (
      !var.azure_resource_creation_enabled ||
      (
        try(data.azurerm_client_config.current[0].subscription_id, "") == var.expected_subscription_id &&
        try(data.azurerm_client_config.current[0].tenant_id, "") == var.expected_tenant_id
      )
    )
    error_message = "The active AzureRM provider scope does not match the reviewed retained control-plane scope."
  }
}
