pipeline {
    agent any

    environment {
        APP_NAME = 'myapp'
        IMAGE_BLUE = 'myapp:v1'
        IMAGE_GREEN = 'myapp:v2'
        K8S_NAMESPACE = 'default'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                echo 'Developer push received. Checking out GitHub repository...'
                checkout scm
            }
        }

        stage('Lint & Tests') {
            steps {
                echo 'Validating application, switcher, and Kubernetes manifests...'
                sh 'node -c src/app.js && node -c src/switcher.js && node -c server.js'
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "Building Green image ${IMAGE_GREEN} (new version)..."
                sh "docker build -t ${IMAGE_GREEN} -t ${APP_NAME}:latest ."
            }
        }

        stage('Deploy Green') {
            steps {
                echo 'Deploying Green environment in parallel with live Blue...'
                sh 'kubectl apply -f k8s/deployment-blue.yaml'
                sh 'kubectl apply -f k8s/deployment-green.yaml'
                sh 'kubectl apply -f k8s/service.yaml'
                sh "kubectl rollout status deployment/myapp-green -n ${K8S_NAMESPACE} --timeout=120s"
            }
        }

        stage('Switch Traffic') {
            steps {
                input 'Green is healthy. Switch Service selector from Blue to Green?'
                sh '''
                  kubectl patch service myapp-service -p '{"spec":{"selector":{"app":"myapp","color":"green"}}}'
                '''
            }
        }

        stage('Verify Live Color') {
            steps {
                sh 'kubectl get svc myapp-service -o wide'
                sh 'kubectl get pods -l app=myapp -o wide'
            }
        }
    }

    post {
        success {
            echo 'Blue-Green switch completed. Live traffic is on Green (v2).'
        }
        failure {
            echo 'Pipeline failed. Rollback with: kubectl patch service myapp-service -p \'{"spec":{"selector":{"app":"myapp","color":"blue"}}}\''
        }
    }
}
