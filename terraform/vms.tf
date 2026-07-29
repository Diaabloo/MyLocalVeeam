# ==============================================================================
# Virtual Machines (Infrastructure Services)
# ==============================================================================
variable "ssh_public_key_path" {
  description = "Path to the public SSH key for the infrastructure VM"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

resource "azurerm_network_interface" "vm_nic" {
  name                = "nic-infra-vm"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.snet_vms.id
    private_ip_address_allocation = "Static"
    private_ip_address            = "10.0.2.4"
  }
}

resource "azurerm_linux_virtual_machine" "infra_vm" {
  name                = "vm-infra-services"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = "Standard_B2s"
  admin_username      = "azureuser"

  network_interface_ids = [
    azurerm_network_interface.vm_nic.id,
  ]

  admin_ssh_key {
    username   = "azureuser"
    public_key = file(var.ssh_public_key_path)
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}