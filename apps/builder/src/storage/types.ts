export interface DeploymentArtifactManifestItem {
  path: string;
  size_bytes: number;
  content_type: string | null;
}

export interface UploadSiteInput {
  deploymentId: string;
  outputDir: string;
}

export interface UploadSiteResult {
  containerId: string;
  previewUrl: string;
  fileCount: number;
  artifacts: DeploymentArtifactManifestItem[];
}

export interface StorageProvider {
  uploadSite(input: UploadSiteInput): Promise<UploadSiteResult>;
}
