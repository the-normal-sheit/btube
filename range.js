const ipaddr = require('ipaddr.js');

function areIPsInSameCIDR(ip1, ip2, cidr) {
  try {
    const parsedCidr = ipaddr.parseCIDR(cidr);
    const parsedIp1 = ipaddr.parse(ip1);
    const parsedIp2 = ipaddr.parse(ip2);

    return parsedIp1.match(parsedCidr) && parsedIp2.match(parsedCidr);
  } catch (e) {
    console.error("Invalid IP or CIDR:", e);
    return false;
  }
}

// Example usage
const ipAddress1 = "192.168.1.10";
const ipAddress2 = "192.168.1.200";
const ipAddress3 = "10.0.0.5";
const subnetCidr = "192.168.1.0/24";

console.log(`${ipAddress1} and ${ipAddress2} in ${subnetCidr}:`, areIPsInSameCIDR(ipAddress1, ipAddress2, subnetCidr));
console.log(`${ipAddress1} and ${ipAddress3} in ${subnetCidr}:`, areIPsInSameCIDR(ipAddress1, ipAddress3, subnetCidr));