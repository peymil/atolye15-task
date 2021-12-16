import { identifyAdress } from './gitProviderIdentifier/identifyAdress';
import gitProviderApis from './gitProviderApis';
import pkgManagerIdentifiers, { pkgManagerBase } from './pkgManagerIdentifiers';
import pkgParsers from './pkgParser/packageParser';
import pkgVersionManagerApis from './pkgVersionManagerApis';

export default async (repoAdress: string) => {
  const { provider: gitProvider, repoName } = identifyAdress(repoAdress);
  const gitServerApi = gitProviderApis.get(gitProvider);
  if (!gitServerApi) throw '';
  let pkgManagerInfo: pkgManagerBase | undefined;
  let file: string | undefined;
  for (const pkgManagerIdentifier of pkgManagerIdentifiers) {
    const fileOrNot = await gitServerApi.searchForFile(repoName, pkgManagerIdentifier.pkgManagerFiles[0]);
    if (fileOrNot) {
      pkgManagerInfo = pkgManagerIdentifier;
      file = fileOrNot;
      break;
    }
  }
  if (!file || !pkgManagerInfo) throw new Error('File not found');
  const dependencies = pkgParsers(pkgManagerInfo.language, file);
  const pkgVersionManagerApi = pkgVersionManagerApis.get(pkgManagerInfo.pkgManagers[0]);
  if (!pkgVersionManagerApi) throw new Error('Pkg version manager is not identified');
  //
  const updateableDependencies: { pkgName: string; oldVersion: string; newVersion: string }[] = [];

  for (const [name, version] of Object.entries(dependencies)) {
    const newVersion = await pkgVersionManagerApi.getLatestVersion(name);
    if (newVersion && newVersion !== version) {
      updateableDependencies.push({ pkgName: name, oldVersion: version, newVersion });
    }
  }
  return updateableDependencies;
};
