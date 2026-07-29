# ==============================================================================
# Main Infrastructure (Resource Group & Networking)
# ==============================================================================
resource "azurerm_resource_group" "rg" {
  name     = "rg-mylocalveeam-prod"
  location = "westeurope"
}

resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-mylocalveeam"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "snet_aks" {
  name                 = "snet-aks"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "snet_vms" {
  name                 = "snet-vms"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["10.0.2.0/24"]
}