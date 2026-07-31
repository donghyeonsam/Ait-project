pipeline {
    agent any

    options {
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    triggers {
        gitlab(
            triggerOnPush: true,
            triggerOnMergeRequest: false,
            branchFilterType: 'NameBasedFilter',
            includeBranchesSpec: 'master'
        )
    }

    stages {
        stage('Build') {
            when {
                anyOf {
                    changeset "be/**"
                    expression { currentBuild.number == 1 }
                    triggeredBy 'UserIdCause'
                }
            }
            steps {
                dir('be') {
                    sh 'chmod +x gradlew'
                    sh './gradlew clean bootJar -x test --no-daemon'
                }
            }
        }

        stage('Deploy') {
            when {
                anyOf {
                    changeset "be/**"
                    expression { currentBuild.number == 1 }
                    triggeredBy 'UserIdCause'
                }
            }
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'ec2-deploy',
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    sh '''
                        JAR=$(ls be/build/libs/*-SNAPSHOT.jar | grep -v plain | head -1)
                        echo "배포할 jar: $JAR"

                        scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
                            "$JAR" "$SSH_USER@172.17.0.1:/tmp/app-new.jar"

                        ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no \
                            "$SSH_USER@172.17.0.1" \
                            "/home/ubuntu/ait/be/deploy.sh /tmp/app-new.jar"
                    '''
                }
            }
        }
    }

    post {
        success { echo '배포 성공' }
        failure { echo '배포 실패 — 콘솔 로그 확인' }
    }
}