import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@nextui-org/react";
import { useState } from "react";
import {
  App,
  AppByIdDocument,
  useBranchesLazyQuery,
  useChangeAppBranchMutation,
  useGithubInstallationIdQuery,
} from "@/generated/graphql";
import toast from "react-hot-toast";

interface BranchChangeInputProp {
  app: App;
}

export const BranchChangeInput = ({ app }: BranchChangeInputProp) => {
  const ghInfo = app.appMetaGithub;

  const [changeBranch, { loading }] = useChangeAppBranchMutation();
  const [name, setName] = useState(ghInfo?.branch);
  const selected = new Set<string>(name ? [name] : []);

  const [fetchBranches, { data: branches, loading: loadingBranches }] =
    useBranchesLazyQuery();
  const { loading: loadingId } = useGithubInstallationIdQuery({
    onCompleted(data) {
      fetchBranches({
        variables: {
          installationId: data.githubInstallationId.id,
          repositoryName: `${ghInfo?.repoOwner}/${ghInfo?.repoName}`,
        },
      });
    },
  });

  if (!ghInfo) return <></>;

  return (
    <div>
      <Modal
        isOpen={!!ghInfo.branch && !!branches && ghInfo.branch !== name}
        onClose={() => setName(ghInfo.branch)}
      >
        <ModalContent>
          <ModalHeader>
            <h4>Cambiar rama</h4>
          </ModalHeader>
          <ModalBody>
            <div>
              ¿Deseas cambiar el nombre de la rama de <b>{ghInfo.branch}</b> a{" "}
              <b>{name}</b>?
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              size="sm"
              onClick={() => setName(ghInfo.branch)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              isDisabled={!name || name === ghInfo.branch}
              onClick={() => {
                changeBranch({
                  variables: {
                    input: {
                      appId: app.id,
                      branchName: name!,
                    },
                  },
                  refetchQueries: [AppByIdDocument],
                })
                  .then((res) => {
                    setName(ghInfo.branch);
                    toast.success("Rama actualizada");
                  })
                  .catch((e) => {
                    toast.error("Rama no actualizada");
                  });
              }}
              isLoading={loading}
            >
              Cambiar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Select
        label="Rama a lanzar"
        placeholder="Ej. master, dev, feat"
        selectedKeys={selected}
        isLoading={loadingBranches || loadingId}
        onSelectionChange={(keys) => {
          if (keys instanceof Set) {
            setName(keys.values().next().value);
          }
        }}
      >
        {branches?.branches.map((it) => (
          <SelectItem key={it.name} value={it.name}>
            {it.name}
          </SelectItem>
        )) ?? []}
      </Select>
    </div>
  );
};
