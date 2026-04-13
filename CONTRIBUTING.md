# Contributing to LedgerCart

Welcome to the LedgerCart project! We are thrilled that you'd like to contribute.

To maintain code quality and streamline reviews, we rely on a strict CI/CD pipeline using GitHub Actions. Please follow the workflow outlined below.

## The Contribution Workflow

Our pipeline requires developers to do their work on local feature branches and push those changes directly to the remote `contribute` branch.

When code hits the `contribute` branch, our automated checking system will build and lint the code. If successful, it automatically creates a Pull Request merging your work into our `test` branch.

### Step-by-Step Guide

#### 1. Setup the Project Locally
Clone the repository, switch to the project directory, and install the required dependencies (Node v20+ recommended).
```bash
git clone <repository-url>
cd LedgerCart-WebSite2
npm install
```

#### 2. Create Your Feature Branch
Always start your work on a brand-new, descriptive feature branch. Do your work here.
```bash
git checkout -b feature/my-awesome-update
```

#### 3. Make Changes & Test Locally
Implement your feature or bug fix. You can run the app locally to ensure everything works:
```bash
npm run dev
```

Before pushing your changes, verify that there are no formatting, linting, or build errors:
```bash
# Check code style issues
npm run lint

# Check if the project compiles successfully
npm run build
```

#### 4. Push to the `contribute` Branch
Once you are happy with your changes, you must push your local feature branch directly to the remote `contribute` branch to trigger the pipeline.
```bash
# Push your current local branch to the remote 'contribute' branch
git push origin feature/my-awesome-update:contribute
```

*(Note: If multiple developers are actively pushing to `contribute`, make sure to pull recent changes locally first, or otherwise coordinate to prevent overwriting someone else's unmerged code string.)*

#### 5. Automated Validation & PR Creation 🤖
Once you push to the `contribute` branch, our **GitHub Actions Validation Workflow** takes over automatically:
1. **Verification**: It clones your `contribute` code and automatically triggers `npm run lint` and `npm run build`.
2. **Auto-PR**: If the build and formatting checks succeed, the automation bot immediately creates a **Pull Request from `contribute` to the `test` branch**.
3. **Review Phase**: Maintainers will review your automated PR on the `test` branch, test the feature, and approve it before merging to `main`. 

## Best Practices
- **Commit Messages**: Write clear, concise commit messages.
- **Code Standards**: We use ESLint and Tailwind CSS. Stick to existing conventions.
- **No Direct Pushes to `main`**: We protect `main` and `test`. All paths must flow through `contribute`.

Thank you for helping us build LedgerCart! 🚀