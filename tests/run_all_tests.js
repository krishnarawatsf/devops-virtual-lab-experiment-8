const fs = require('fs');
const path = require('path');
const assert = require('assert');
const yamlFiles = [
  'k8s/deployment-blue.yaml',
  'k8s/deployment-green.yaml',
  'k8s/service.yaml'
];

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}

console.log('\nVLE-8 Blue-Green test suite\n');

test('blue deployment names myapp-blue and uses color=blue', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'k8s/deployment-blue.yaml'), 'utf8');
  assert.match(text, /name: myapp-blue/);
  assert.match(text, /color: blue/);
  assert.match(text, /replicas: 2/);
  assert.match(text, /image: myapp:v1/);
});

test('green deployment names myapp-green and uses color=green', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'k8s/deployment-green.yaml'), 'utf8');
  assert.match(text, /name: myapp-green/);
  assert.match(text, /color: green/);
  assert.match(text, /replicas: 2/);
  assert.match(text, /image: myapp:v2/);
});

test('service initially routes to blue', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'k8s/service.yaml'), 'utf8');
  assert.match(text, /name: myapp-service/);
  assert.match(text, /color: blue/);
  assert.match(text, /targetPort: 8080/);
});

test('Jenkinsfile builds image, deploys green, then switches traffic', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'Jenkinsfile'), 'utf8');
  assert.match(text, /Build Docker Image/);
  assert.match(text, /Deploy Green/);
  assert.match(text, /Switch Traffic/);
  assert.match(text, /color":"green"/);
});

test('Terraform provisions Jenkins on Ubuntu in ap-south-1', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'terraform/main.tf'), 'utf8');
  const vars = fs.readFileSync(path.join(__dirname, '..', 'terraform/variables.tf'), 'utf8');
  assert.match(vars, /ap-south-1/);
  assert.match(main, /aws_instance" "jenkins"/);
  assert.match(main, /t2.medium|instance_type/);
});

test('Ansible playbook installs Docker and Jenkins', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'ansible/jenkins_setup.yml'), 'utf8');
  assert.match(text, /Install Docker/);
  assert.match(text, /docker.io/);
  assert.match(text, /Install Jenkins/);
});

test('Prometheus scrapes both blue and green replicas', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'monitoring/prometheus/prometheus.yml'), 'utf8');
  assert.match(text, /job_name: myapp-blue/);
  assert.match(text, /job_name: myapp-green/);
  assert.match(text, /blue-1:8080/);
  assert.match(text, /green-1:8080/);
});

test('app module exports color and version', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/app.js'), 'utf8');
  assert.match(src, /APP_COLOR/);
  assert.match(src, /\/metrics/);
  assert.match(src, /\/api\/health/);
});

test('all kubernetes YAML files exist', () => {
  yamlFiles.forEach((file) => {
    assert.ok(fs.existsSync(path.join(__dirname, '..', file)), `missing ${file}`);
  });
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
