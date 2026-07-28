# ==============================================================================
# Azure Kubernetes Service (AKS) Cluster
# ==============================================================================
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "aks-mylocalveeam-prod"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "mylocalveeam"

  default_node_pool {
    name           = "default"
    node_count     = 2
    vm_size        = "Standard_D2s_v3"
    vnet_subnet_id = azurerm_subnet.snet_aks.id
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
  }
}