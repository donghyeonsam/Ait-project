pipeline {
    agent any

    options {
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    triggers {
        gitlab(
            triggerOnPush: true,
            triggerOnMergeRequest: true,
            triggerOpenMergeRequestOnPush: 'source',
            branchFilterType: 'NameBasedFilter',
            includeBranchesSpec: 'master,develop'
        )
    }

    environment {
        IS_MR = "${env.gitlabMergeRequestIid != null ? 'true' : 'false'}"
    }

    stages {
        stage('Check changes') {
            steps {
                script {
                    def files = ''

                    if (env.IS_MR == 'true') {
                        def target = env.gitlabTargetBranch
                        sh "git fetch --no-tags origin ${target}:refs/remotes/origin/${target} || true"
                        files = sh(
                            script: "git diff --name-only origin/${target}...HEAD || true",
                            returnStdout: true
                        ).trim()
                    } else if (env.gitlabBefore && !env.gitlabBefore.startsWith('0000')) {
                        files = sh(
                            script: "git diff --name-only ${env.gitlabBefore} ${env.gitlabAfter} || true",
                            returnStdout: true
                        ).trim()
                    }

                    if (files == '') {
                        env.BE_CHANGED = 'true'
                        echo '변경 파일을 판단할 수 없어 빌드를 진행합니다. (첫 빌드 또는 수동 실행)'
                    } else {
                        env.BE_CHANGED = files.split('\n').any { it.startsWith('be/') } ? 'true' : 'false'
                        echo "변경된 파일:\n${files}"
                        echo "be 변경 여부: ${env.BE_CHANGED}"
                    }

                    if (env.IS_MR == 'true') {
                        echo "MR 검증: ${env.gitlabSourceBranch} → ${env.gitlabTargetBranch}"
                    } else {
                        echo "브랜치 push: ${env.gitlabBranch}"
                    }
                }
            }
        }

        stage('Build') {
            when {
                expression { env.BE_CHANGED == 'true' }
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
                allOf {
                    expression { env.BE_CHANGED == 'true' }
                    expression { env.IS_MR == 'false' }
                    expression { (env.gitlabBranch ?: '').endsWith('master') }
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
        success { echo '성공' }
        failure { echo '실패 — 콘솔 로그 확인' }
    }
}