import { DatabaseByIdQuery, DatabaseInfoQuery } from '@/generated/graphql.server';
import { serverClient } from '@/lib/apollo.server';
import { Button, Card, Dropdown, Grid, Link, Loading, Modal, Table, Text } from '@nextui-org/react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { FiInfo } from 'react-icons/fi';
import {
    LogPayload,
    useAppsQuery,
    useLinkDatabaseLogsSubscription,
    useLinkDatabaseMutation,
    useUnlinkDatabaseLogsSubscription,
    useUnlinkDatabaseMutation
} from '../../generated/graphql';
import { IconButton } from '../../ui/components/IconButton';
import { Terminal } from '../../ui/components/Terminal';
import { AdminLayout } from '../../ui/layout/layout';
import { DatabaseHeaderInfo } from '../../ui/modules/database/DatabaseHeaderInfo';
import { DatabaseHeaderTabNav } from '../../ui/modules/database/DatabaseHeaderTabNav';
import { useToast } from '../../ui/toast';

interface DatabaseProps {
    database: DatabaseByIdQuery['database'];
    databaseInfo: DatabaseInfoQuery['databaseInfo'];
}

const Database = ({ database, databaseInfo }: DatabaseProps) => {
    const router = useRouter();
    const databaseId = router.query.databaseId as string;
    const toast = useToast();
    const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [arrayOfUnlinkLogs, setArrayOfUnlinkLogs] = useState<LogPayload[]>([]);
    const [arrayOfLinkLogs, setArrayOfLinkLogs] = useState<LogPayload[]>([]);
    const [appAboutToUnlink, setAppAboutToUnlink] = useState<string>();
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);
    const [processStatus, setProcessStatus] = useState<'running' | 'notStarted' | 'finished'>(
        'notStarted'
    );
    const [unlinkLoading, setUnlinkLoading] = useState(false);
    const [linkLoading, setLinkLoading] = useState(false);

    const [selectedApp, setSelectedApp] = useState({
        value: { name: '', id: '' },
        label: 'Selecciona una aplicación',
    });
    const [
        linkDatabaseMutation,
        { data: databaseLinkData, loading: databaseLinkLoading, error: databaseLinkError },
    ] = useLinkDatabaseMutation();

    const { data: appsData } = useAppsQuery({
        variables: {
            limit: 1_000_000,
        },
    });

    const [unlinkDatabaseMutation] = useUnlinkDatabaseMutation();

    useUnlinkDatabaseLogsSubscription({
        onSubscriptionData: (data) => {
            const logsExist = data.subscriptionData.data?.unlinkDatabaseLogs;
            if (logsExist) {
                setArrayOfUnlinkLogs((currentLogs) => {
                    return [...currentLogs, logsExist];
                });
                if (logsExist.type === 'end:success' || logsExist.type === 'end:failure') {
                    setProcessStatus('finished');
                }
            }
        },
    });

    useLinkDatabaseLogsSubscription({
        onSubscriptionData: (data) => {
            const logsExist = data.subscriptionData.data?.linkDatabaseLogs;
            if (logsExist) {
                setArrayOfLinkLogs((currentLogs) => {
                    return [...currentLogs, logsExist];
                });
                if (logsExist.type === 'end:success' || logsExist.type === 'end:failure') {
                    setProcessStatus('finished');
                }
            }
        },
    });

    const apps = appsData?.apps;

    const handleUnlink = async (databaseId: string, appId: string) => {
        try {
            await unlinkDatabaseMutation({
                variables: {
                    input: {
                        databaseId,
                        appId,
                    },
                },
            });
            setIsTerminalVisible(true);
            setUnlinkLoading(true);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const linkedApps = database?.apps ?? [];
    const linkedIds = linkedApps.map((db) => db.id);
    const notLinkedApps = apps?.items.filter((db) => {
        return linkedIds?.indexOf(db.id) === -1;
    }) ?? [];

    const appOptions = notLinkedApps.map((app) => {
        return {
            value: { name: app.name, id: app.id },
            label: app.name,
        };
    });

    const handleConnect = async (databaseId: string, appId: string) => {
        try {
            await linkDatabaseMutation({
                variables: {
                    input: {
                        databaseId,
                        appId,
                    },
                },
            });
            setSelectedApp({
                value: { name: '', id: '' },
                label: 'Selecciona una aplicación',
            });
            setIsTerminalVisible(true);
            setLinkLoading(true);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const databaseInfos = databaseInfo.info
        .map((data) => data.trim())
        .map((info) => {
            const name = info.split(':')[0];
            const value = info.substring(info.indexOf(':') + 1).trim();
            return { name, value };
        });

    return (
        <AdminLayout pageTitle={database?.name}>
            {database && <>
                <div>
                    <DatabaseHeaderInfo database={database} />
                    <DatabaseHeaderTabNav database={database} />
                </div>

                <Grid.Container gap={4}>
                    <Grid xs={12} md={6} direction="column">
                        <Text h3 className="mb-8">
                            Información de la base de datos
                        </Text>
                        <Table>
                            <Table.Header>
                                <Table.Column> </Table.Column>
                                <Table.Column>Valor</Table.Column>
                            </Table.Header>
                            <Table.Body>
                                <Table.Row>
                                    <Table.Cell>Nombre</Table.Cell>
                                    <Table.Cell>{database.name}</Table.Cell>
                                </Table.Row>
                                <Table.Row>
                                    <Table.Cell>Identificador</Table.Cell>
                                    <Table.Cell>{database.id}</Table.Cell>
                                </Table.Row>
                                <Table.Row>
                                    <Table.Cell>Tipo</Table.Cell>
                                    <Table.Cell>{database.type}</Table.Cell>
                                </Table.Row>
                            </Table.Body>
                        </Table>
                    </Grid>

                    <Grid xs={12} md={6} direction="column">
                        <Text h3 className="mb-8">
                            Aplicaciones conectadas
                        </Text>
                        {apps && apps.items.length === 0 ? (
                            <>
                                <Text className="mb-4">
                                    Actualmente no tienes aplicaciones creadas. Para crear una realiza
                                    el proceso de creación.
                                </Text>
                                <Link href="/create-app">
                                    <Button>Crear aplicación</Button>
                                </Link>
                            </>
                        ) : (
                            <>
                                {notLinkedApps.length !== 0 ? (
                                    <div>
                                        <Dropdown>
                                            <Dropdown.Button flat>{selectedApp.label}</Dropdown.Button>
                                            <Dropdown.Menu
                                                selectionMode="single"
                                                selectedKeys={new Set([selectedApp.value.id])}
                                                onAction={(key) => {
                                                    const app = appOptions.find(
                                                        (option) => option.value.id === key
                                                    );

                                                    if (key === 'create-new-app-internal-id') {
                                                        router.push({
                                                            pathname: '/create-app',
                                                        });
                                                    } else if (app) {
                                                        setSelectedApp({
                                                            label: app.value.name,
                                                            value: app.value,
                                                        });
                                                    }
                                                }}
                                                color="primary"
                                            >
                                                <Dropdown.Section>
                                                    {appOptions.map((database) => (
                                                        <Dropdown.Item key={database.value.id}>
                                                            {database.label}
                                                        </Dropdown.Item>
                                                    ))}
                                                </Dropdown.Section>
                                                <Dropdown.Section>
                                                    <Dropdown.Item key="create-new-app-internal-id">
                                                        Crear aplicación nueva
                                                    </Dropdown.Item>
                                                </Dropdown.Section>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                        {databaseLinkError && (
                                            <Text color="$error">
                                                {databaseLinkError.graphQLErrors[0].message}
                                            </Text>
                                        )}
                                        <Button
                                            className="mt-4"
                                            disabled={!selectedApp.value.id}
                                            onClick={() => setIsLinkModalOpen(true)}
                                        >
                                            {databaseLinkLoading &&
                                                !databaseLinkData &&
                                                !databaseLinkError ? (
                                                <Loading color="currentColor" type='points-opacity' />
                                            ) : (
                                                'Enlazar aplicación'
                                            )}
                                        </Button>
                                        <Modal
                                            preventClose={processStatus === 'running'}
                                            width={isTerminalVisible ? '70%' : undefined}
                                            open={isLinkModalOpen}
                                            blur
                                            closeButton
                                            onClose={() => {
                                                setIsLinkModalOpen(false);
                                                router.reload();
                                                setLinkLoading(false);
                                                setIsTerminalVisible(false);
                                                setProcessStatus('notStarted');
                                            }}
                                        >
                                            <Modal.Header>
                                                <Text h4>Enlazar aplicación</Text>
                                            </Modal.Header>
                                            <Modal.Body>
                                                {isTerminalVisible ? (
                                                    <>
                                                        <p className="mb-2 ">
                                                            ¡Enlazando <b>{selectedApp.value.name}</b>{' '}
                                                            con <b>{database.name}</b>!
                                                        </p>
                                                        <p>
                                                            El proceso de enlace usualmente tarda unos
                                                            minutos. Respira un poco, los registros
                                                            aparecerán pronto:
                                                        </p>
                                                        <Terminal className={'w-6/6'}>
                                                            {arrayOfLinkLogs.map((log) => (
                                                                <p
                                                                    key={arrayOfLinkLogs.indexOf(log)}
                                                                    className="leading-5 text-s"
                                                                >
                                                                    {log.message}
                                                                </p>
                                                            ))}
                                                        </Terminal>
                                                    </>
                                                ) : (
                                                    <p>
                                                        ¿Estás seguro de enlazar la aplicación{' '}
                                                        <b>{selectedApp.value.name}</b> con{' '}
                                                        <b>{database.name}</b>?
                                                    </p>
                                                )}
                                            </Modal.Body>
                                            <Modal.Footer>
                                                <Button
                                                    disabled={processStatus === 'running'}
                                                    size="sm"
                                                    color="error"
                                                    bordered
                                                    onClick={() => {
                                                        setIsLinkModalOpen(false);
                                                        router.reload();

                                                        setLinkLoading(false);
                                                        setIsTerminalVisible(false);
                                                        setProcessStatus('notStarted');
                                                    }}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    type="submit"
                                                    onClick={() => {
                                                        setProcessStatus('running');
                                                        handleConnect(databaseId, selectedApp.value.id);
                                                    }}
                                                    disabled={isTerminalVisible}
                                                >
                                                    {(isTerminalVisible ? false : linkLoading) ? (
                                                        <Loading size="sm" color="currentColor" type='points-opacity' />
                                                    ) : (
                                                        'Enlazar'
                                                    )}
                                                </Button>
                                            </Modal.Footer>
                                        </Modal>
                                    </div>
                                ) : (
                                    <>
                                        <p>
                                            Todas las aplicaciones ya están enlazadas con esta
                                            aplicación. Si quieres crear más aplicaciones inicia el
                                            proceso de creación de aplicaciones.
                                        </p>
                                        <div className="mt-4">
                                            <Link href="/create-app">
                                                <Button bordered className="mr-3 text-sm">
                                                    Crear aplicación
                                                </Button>
                                            </Link>
                                        </div>
                                    </>
                                )}

                                {database && database.apps && (
                                    <>
                                        <Text h3 className="mt-8 mb-4">
                                            {database.apps.length > 0 && 'Aplicaciones enlazadas'}
                                        </Text>
                                        <div className="flex flex-col">
                                            {database.apps.map((app, index) => {
                                                return (
                                                    <div key={index}>
                                                        <Card variant="bordered">
                                                            <Card.Body>
                                                                <div className="flex flex-row items-center">
                                                                    <Text
                                                                        className="mx-4 text-lg"
                                                                        b
                                                                        css={{ flexGrow: 1 }}
                                                                    >
                                                                        {app.name}
                                                                    </Text>
                                                                    <Link href={`/app/${app.id}`}>
                                                                        <IconButton
                                                                            className="mr-2"
                                                                            color="primary"
                                                                            icon={<FiInfo size={16} />}
                                                                        />
                                                                    </Link>
                                                                    <Button
                                                                        color="error"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setIsUnlinkModalOpen(true);
                                                                            setAppAboutToUnlink(
                                                                                app.name
                                                                            );
                                                                        }}
                                                                    >
                                                                        Desenlazar
                                                                    </Button>
                                                                </div>
                                                            </Card.Body>
                                                        </Card>

                                                        <Modal
                                                            preventClose={processStatus === 'running'}
                                                            width={
                                                                isTerminalVisible ? '70%' : undefined
                                                            }
                                                            open={isUnlinkModalOpen}
                                                            blur
                                                            closeButton
                                                            onClose={() => {
                                                                setIsUnlinkModalOpen(false);
                                                                router.reload();

                                                                setUnlinkLoading(false);
                                                                setIsTerminalVisible(false);
                                                                setAppAboutToUnlink('');
                                                                setProcessStatus('notStarted');
                                                            }}
                                                        >
                                                            <Modal.Header>
                                                                <Text h4>Desenlazar aplicación</Text>
                                                            </Modal.Header>
                                                            <Modal.Body>
                                                                {isTerminalVisible ? (
                                                                    <>
                                                                        <p className="mb-2 ">
                                                                            Desenlazando{' '}
                                                                            <b>{app.name}</b> de{' '}
                                                                            <b>{appAboutToUnlink}</b>!
                                                                        </p>
                                                                        <p className="mb-2 text-gray-500">
                                                                            El proceso de desenlace
                                                                            usualmente tarda unos
                                                                            minutos. Respira un poco,
                                                                            los registros apareceran
                                                                            pronto:
                                                                        </p>
                                                                        <Terminal className={'w-6/6'}>
                                                                            {arrayOfUnlinkLogs.map(
                                                                                (log) => (
                                                                                    <p
                                                                                        key={arrayOfUnlinkLogs.indexOf(
                                                                                            log
                                                                                        )}
                                                                                        className="leading-5 text-s"
                                                                                    >
                                                                                        {log.message}
                                                                                    </p>
                                                                                )
                                                                            )}
                                                                        </Terminal>
                                                                    </>
                                                                ) : (
                                                                    <p>
                                                                        ¿Estás seguro de desenlazar{' '}
                                                                        <b>{database.name}</b> de{' '}
                                                                        <b>{appAboutToUnlink}</b>?
                                                                    </p>
                                                                )}
                                                            </Modal.Body>
                                                            <Modal.Footer>
                                                                <Button
                                                                    disabled={
                                                                        processStatus === 'running'
                                                                    }
                                                                    size="sm"
                                                                    bordered
                                                                    onClick={() => {
                                                                        setIsUnlinkModalOpen(false);
                                                                        router.reload();

                                                                        setUnlinkLoading(false);
                                                                        setIsTerminalVisible(false);
                                                                        setAppAboutToUnlink('');
                                                                        setProcessStatus('notStarted');
                                                                    }}
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    type="submit"
                                                                    color="error"
                                                                    onClick={() => {
                                                                        setProcessStatus('running');
                                                                        handleUnlink(
                                                                            database.id,
                                                                            app.id
                                                                        );
                                                                    }}
                                                                    disabled={isTerminalVisible}
                                                                >
                                                                    {(
                                                                        isTerminalVisible
                                                                            ? false
                                                                            : unlinkLoading
                                                                    ) ? (
                                                                        <Loading
                                                                            size="sm"
                                                                            color="currentColor"
                                                                            type='points-opacity'
                                                                        />
                                                                    ) : (
                                                                        'Desenlazar'
                                                                    )}
                                                                </Button>
                                                            </Modal.Footer>
                                                        </Modal>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </Grid>
                    <Grid xs={12} direction="column">
                        <Text h3 className="mt-8 mb-8">
                            Información del contenedor
                        </Text>
                        <Table>
                            <Table.Header>
                                <Table.Column>Nombre</Table.Column>
                                <Table.Column>Valor</Table.Column>
                            </Table.Header>
                            <Table.Body>
                                {databaseInfos?.map((info, index) => (
                                    <Table.Row key={index}>
                                        <Table.Cell>
                                            <Text b>{info.name}</Text>
                                        </Table.Cell>
                                        <Table.Cell>{info.value}</Table.Cell>
                                    </Table.Row>
                                )) ?? []}
                            </Table.Body>
                        </Table>
                    </Grid>
                </Grid.Container>
            </>}
        </AdminLayout>
    );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
    const session = await getSession(ctx);

    const database = await serverClient.databaseById({
        databaseId: ctx.params?.databaseId as string
    }, {
        "Authorization": `Bearer ${session?.accessToken}`
    })

    const databaseInfo = await serverClient.databaseInfo({
        databaseId: ctx.params?.databaseId as string
    }, {
        "Authorization": `Bearer ${session?.accessToken}`
    })

    return {
        props: {
            database: database.database,
            databaseInfo: databaseInfo.databaseInfo
        }
    }
}

export default Database;