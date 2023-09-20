import { Button, Grid, Input, Link, Loading, Text } from '@nextui-org/react';
import { trackGoal } from 'fathom-client';
import { useFormik } from 'formik';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { TerminalOutput } from 'react-terminal-ui';
import * as yup from 'yup';
import { trackingGoals } from '../constants';
import {
    DbTypes,
    LogPayload,
    useCreateDatabaseLogsSubscription,
    useCreateDatabaseMutation,
    useDatabaseQuery,
    useIsPluginInstalledLazyQuery
} from '../generated/graphql';
import { Alert } from '../ui/components/Alert';
import { CodeBox } from '../ui/components/CodeBox';
import { LoadingSection } from '../ui/components/LoadingSection';
import { TagInput } from '../ui/components/TagInput';
import { Terminal } from '../ui/components/Terminal';
import { MariaDBIcon } from '../ui/icons/MariaDBIcon';
import { MongoIcon } from '../ui/icons/MongoIcon';
import { MySQLIcon } from '../ui/icons/MySQLIcon';
import { PostgreSQLIcon } from '../ui/icons/PostgreSQLIcon';
import { RedisIcon } from '../ui/icons/RedisIcon';
import { AdminLayout } from '../ui/layout/layout';
import { useToast } from '../ui/toast';
import { dbTypeToDokkuPlugin } from '../utils/utils';

interface DatabaseBoxProps {
    label: string;
    selected: boolean;
    icon: React.ReactNode;
    onClick?(): void;
}

enum DbCreationStatus {
    FAILURE = 'Failure',
    SUCCESS = 'Success',
}

function typeToDockerHub(type: DbTypes): string | undefined {
    switch (type) {
        case DbTypes.Postgresql:
            return "postgres"
        case DbTypes.Mongodb:
            return "mongo"
        case DbTypes.Mysql:
            return "mysql"
        case DbTypes.Redis:
            return "redis"
        case DbTypes.Mariadb:
            return "mariadb";
    }

    return undefined;
}

const DatabaseBox = ({ label, selected, icon, onClick }: DatabaseBoxProps) => {
    return (
        <div
            className={`w-full border-solid p-12 flex flex-col border-3 items-center rounded-2xl ${selected ? "border-blue-500" : "border-gray-600"} ${onClick ? `grayscale-0 opacity-100 cursor-pointer hover:bg-[#7a7a7a1f]` : 'grayscale-1 opacity-50'
                }`}
            onClick={onClick}
        >
            <div className="h-12 mb-2">{icon}</div>
            <Text h3>{label}</Text>
        </div>
    );
};

const CreateDatabase = () => {
    const history = useRouter();
    const toast = useToast();

    const { data: dataDb } = useDatabaseQuery({
        variables: {
            limit: 1_000_000,
        },
    });
    const [arrayOfCreateDbLogs, setArrayofCreateDbLogs] = useState<LogPayload[]>([]);
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);
    const [createDatabaseMutation] = useCreateDatabaseMutation();
    const [isDbCreationSuccess, setIsDbCreationSuccess] = useState<DbCreationStatus>();
    const [tags, setTags] = useState<string[]>([]);

    useCreateDatabaseLogsSubscription({
        onSubscriptionData: (data) => {
            const logsExist = data.subscriptionData.data?.createDatabaseLogs;

            if (logsExist) {
                setArrayofCreateDbLogs((currentLogs) => {
                    return [...currentLogs, logsExist];
                });
                if (logsExist.type === 'end:success') {
                    setIsDbCreationSuccess(DbCreationStatus.SUCCESS);
                } else if (logsExist.type === 'end:failure') {
                    setIsDbCreationSuccess(DbCreationStatus.FAILURE);
                }
            }
        },
    });

    const createDatabaseSchema = yup.object({
        type: yup.string().oneOf(Object.values(DbTypes)).required(),
        name: yup.string().when('type', (type: DbTypes) => {
            return yup
                .string()
                .required('Nombre de la base de datos requerido')
                .matches(/^[a-z0-9-]+$/, `Debe cumplir con el patron ${/^[a-z0-9-]+$/}`)
                .test(
                    'Ya existe el nombre',
                    `Ya creaste una base de datos ${type} con este nombre`,
                    (name) =>
                        !dataDb?.databases.items.find((db) => db.name === name && type === db.type)
                );
        }),
        image: yup.string().optional(),
        version: yup.string()
            .matches(/^([a-zA-Z0-9-]+\.?)+$/, `Debe cumplir el patron ${/([a-zA-Z0-9-]+\.?)+/}`)
    });

    const [
        isDokkuPluginInstalled,
        { data, loading, error: isDokkuPluginInstalledError },
    ] = useIsPluginInstalledLazyQuery({
        pollInterval: 5000,
    });
    const formik = useFormik<{ name: string; type: DbTypes, version: string, image: string }>({
        initialValues: {
            name: '',
            version: "",
            image: "",
            type: DbTypes.Postgresql,
        },
        validateOnChange: true,
        validationSchema: createDatabaseSchema,
        onSubmit: async (values) => {
            try {
                await createDatabaseMutation({
                    variables: {
                        input: {
                            name: values.name,
                            type: values.type,
                            version: values.version ? values.version : undefined,
                            image: values.image ? values.image : undefined,
                            tags: tags.length > 0 ? tags : undefined
                        },
                    },
                });
                setIsTerminalVisible(true);

                trackGoal(trackingGoals.createDatabase, 0);
            } catch (error: any) {
                toast.error(error.message);
            }
        },
    });

    const isPluginInstalled = data?.isPluginInstalled.isPluginInstalled;

    const handleNext = () => {
        setIsTerminalVisible(false);
        const dbId = arrayOfCreateDbLogs[arrayOfCreateDbLogs.length - 1].message;
        history.push(`/database/${dbId}`);
    };

    useEffect(() => {
        isDokkuPluginInstalled({
            variables: {
                pluginName: dbTypeToDokkuPlugin(formik.values.type),
            },
        });
    }, [formik.values.type, isPluginInstalled, isDokkuPluginInstalled]);

    useEffect(() => {
        isDbCreationSuccess === DbCreationStatus.FAILURE
            ? toast.error('Error al crear la base de datos')
            : isDbCreationSuccess === DbCreationStatus.SUCCESS &&
            toast.success('Base de datos creada');
    }, [isDbCreationSuccess, toast]);

    return (
        <AdminLayout pageTitle='Crear base de datos'>
            <Text h2>Crear una base de datos</Text>
            <div className="mt-12">
                {isTerminalVisible ? (
                    <div className="mb-12">
                        <Text>
                            Creando la base de datos <b>{formik.values.type}</b>{' '}
                            <b>{formik.values.name}</b>
                        </Text>
                        <Text className="mb-8">
                            Crear una base de datos usualmente toma unos cuantos minutos.
                            Respira un poco, los registros apareceran pronto:
                        </Text>
                        <Terminal>
                            {arrayOfCreateDbLogs.map((log, index) => (
                                <TerminalOutput key={index}>{log.message}</TerminalOutput>
                            ))}
                        </Terminal>

                        {!!isDbCreationSuccess &&
                            isDbCreationSuccess === DbCreationStatus.SUCCESS ? (
                            <div className="flex justify-end mt-12">
                                <Button
                                    onClick={() => handleNext()}
                                    iconRight={<FiArrowRight size={20} />}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        ) : !!isDbCreationSuccess &&
                            isDbCreationSuccess === DbCreationStatus.FAILURE ? (
                            <div className="flex justify-end mt-12">
                                <Button
                                    onClick={() => {
                                        setIsTerminalVisible(false);
                                        formik.resetForm();
                                    }}
                                    icon={<FiArrowLeft size={20} />}
                                >
                                    Atras
                                </Button>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="mt-8">
                        <form onSubmit={formik.handleSubmit}>
                            {loading ? <LoadingSection py={8} /> : <div className="mt-12">
                                {isDokkuPluginInstalledError ? (
                                    <Alert
                                        type="error"
                                        title="Solicitud fallida"
                                        message={isDokkuPluginInstalledError.message}
                                    />
                                ) : null}
                                {data?.isPluginInstalled.isPluginInstalled === false &&
                                    !loading && (
                                        <>
                                            <Text>
                                                Antes de crear una base de datos{' '}
                                                <b>{formik.values.type.toLowerCase()}</b>,
                                                necesitas correr el siguiente comando en tu
                                                servidor de Dokku:
                                            </Text>
                                            <CodeBox lang="bash">
                                                {`sudo dokku plugin:install https://github.com/dokku/dokku-${dbTypeToDokkuPlugin(
                                                    formik.values.type
                                                )}.git ${dbTypeToDokkuPlugin(
                                                    formik.values.type
                                                )}`}
                                            </CodeBox>
                                            <Text>Unos segundos después puedes continuar</Text>
                                        </>
                                    )}
                                {data?.isPluginInstalled.isPluginInstalled === true &&
                                    !loading && (
                                        <Grid.Container gap={2} className="mt-8">
                                            <Grid
                                                xs={12}
                                                css={{ padding: 0 }}
                                                direction="column"
                                            >
                                                <Input
                                                    autoComplete="off"
                                                    id="name"
                                                    label="Nombre de la base de datos"
                                                    name="name"
                                                    width="300px"
                                                    placeholder="Nombre"
                                                    value={formik.values.name}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                />
                                                <Text color="$error">{formik.errors.name}</Text>
                                            </Grid>
                                            <Grid
                                                xs={12}
                                                css={{ padding: 0 }}
                                                direction="column"
                                                className='mt-4'
                                            >
                                                <Input
                                                    autoComplete="off"
                                                    id="image"
                                                    label="Imagen"
                                                    name="image"
                                                    width="300px"
                                                    placeholder="docker/imagen"
                                                    value={formik.values.image}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                />
                                                <Text color="$error" className='mb-4'>{formik.errors.image}</Text>
                                                <Input
                                                    autoComplete="off"
                                                    id="version"
                                                    label="Versión"
                                                    name="version"
                                                    width="300px"
                                                    placeholder="x.x.x"
                                                    value={formik.values.version}
                                                    onChange={formik.handleChange}
                                                    onBlur={formik.handleBlur}
                                                />
                                                <Text color="$error">{formik.errors.version}</Text>
                                                {typeToDockerHub(formik.values.type) && <Text className="mt-1" h6>
                                                    ¿No recuerdas las versiones disponibles de <i>{typeToDockerHub(formik.values.type)}</i>?{' '}
                                                    <Link
                                                        href={`https://hub.docker.com/_/${typeToDockerHub(formik.values.type)}/tags`}
                                                        target="_blank"
                                                        isExternal
                                                    >
                                                        click aquí para verlas
                                                    </Link>
                                                </Text>}
                                                <TagInput
                                                    tags={tags}
                                                    onAdd={(tag) => setTags([...tags, tag])}
                                                    onRemove={(tag) => setTags(tags.filter((it) => it !== tag))} />
                                            </Grid>
                                        </Grid.Container>
                                    )}
                            </div>}

                            <div className="mt-12">
                                <Text h3>Elige tu base de datos</Text>
                                <Grid.Container gap={3}>
                                    <Grid xs={12} md={3}>
                                        <DatabaseBox
                                            selected={formik.values.type === DbTypes.Postgresql}
                                            label="PostgreSQL"
                                            icon={<PostgreSQLIcon size={40} />}
                                            onClick={() =>
                                                formik.setFieldValue('type', DbTypes.Postgresql)
                                            }
                                        />
                                    </Grid>
                                    <Grid xs={12} md={3}>
                                        <DatabaseBox
                                            selected={formik.values.type === DbTypes.Mysql}
                                            label="MySQL"
                                            icon={<MySQLIcon size={40} />}
                                            onClick={() =>
                                                formik.setFieldValue('type', DbTypes.Mysql)
                                            }
                                        />
                                    </Grid>
                                    <Grid xs={12} md={3}>
                                        <DatabaseBox
                                            selected={formik.values.type === DbTypes.Mongodb}
                                            label="MongoDB"
                                            icon={<MongoIcon size={40} />}
                                            onClick={() =>
                                                formik.setFieldValue('type', DbTypes.Mongodb)
                                            }
                                        />
                                    </Grid>
                                    <Grid xs={12} md={3}>
                                        <DatabaseBox
                                            selected={formik.values.type === DbTypes.Redis}
                                            label="Redis"
                                            icon={<RedisIcon size={40} />}
                                            onClick={() =>
                                                formik.setFieldValue('type', DbTypes.Redis)
                                            }
                                        />
                                    </Grid>
                                    <Grid xs={12} md={3}>
                                        <DatabaseBox
                                            selected={formik.values.type === DbTypes.Mariadb}
                                            label="MariaDB"
                                            icon={<MariaDBIcon size={40} />}
                                            onClick={() =>
                                                formik.setFieldValue('type', DbTypes.Mariadb)
                                            }
                                        />
                                    </Grid>
                                </Grid.Container>
                            </div>

                            <div className="flex justify-end mt-12">
                                <Button
                                    disabled={
                                        data?.isPluginInstalled.isPluginInstalled === false ||
                                        !formik.values.name ||
                                        !!formik.errors.name ||
                                        !dataDb?.databases
                                    }
                                    iconRight={<FiArrowRight size={20} />}
                                    type="submit"
                                >
                                    {formik.isSubmitting ? (
                                        <Loading color="currentColor" type='points-opacity' />
                                    ) : (
                                        'Crear'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default CreateDatabase;