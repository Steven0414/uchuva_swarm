provider "digitalocean" {
    token = "${var.do_token}"
}

resource "digitalocean_ssh_key" "default" {
    name       = "SSH public key"
    public_key = "${file(var.ssh_public_key)}"
}

resource "digitalocean_droplet" "controller" {
    name   = "controller"
    image  = "${var.do_image}"
    region = "${var.do_region}"
    size   = "${var.size_controller}"
    private_networking = true
    ssh_keys = [
      "${digitalocean_ssh_key.default.id}"
    ]
    provisioner "file" {
        source      = "${path.module}/../common/scripts/installpuppet.sh"
	destination = "/tmp/installpuppet.sh"
    }
    provisioner "file" {
        source = "${path.module}/../common/puppet"
        destination = "/tmp"
    }
    provisioner "remote-exec" {
   	inline = [
	  "bash /tmp/installpuppet.sh ${digitalocean_droplet.controller.ipv4_address} controller.pp",
	]
    }
}

resource "digitalocean_droplet" "node" {
    name   = "server${count.index + 1}"
    image  = "${var.do_image}"
    region = "${var.do_region}"
    size   = "${var.size_node}"
    count  = "${var.number_of_nodes}"
    private_networking = true
    ssh_keys = [
      "${digitalocean_ssh_key.default.id}"
    ]

    provisioner "file" {
       source      = "${path.module}/../common/scripts/installpuppet.sh"
       destination = "/tmp/installpuppet.sh"
    }
    provisioner "file" {
       source = "${path.module}/../common/puppet"
       destination = "/tmp"
    }
    provisioner "remote-exec" {
       inline = [
  	  "bash /tmp/installpuppet.sh ${digitalocean_droplet.controller.ipv4_address} node.pp",
	]
    }
}

#resource "null_resource" "config-host-ips" {
#    count = "${var.number_of_nodes}"
#    connection {
#        user = "root"
#        host = "${element(digitalocean_droplet.node.*.ipv4_address, count.index)}"
#    }
#    provisioner "local-exec" {
#        command = "bash /tmp/updatehost.sh ${digitalocean_droplet.controller.ipv4_address} ${join(" ", digitalocean_droplet.node.*.ipv4_address_private)}"
#    }
#}

resource "digitalocean_record" "uchuva" {
  count  = "${var.domain ? 1 : 0}"
  domain = "${var.domain}"
  type   = "A"
  name   = "uchuva"
  value  = "${digitalocean_droplet.controller.ipv4_address}"
}