"use client";

import { AppByIdQuery } from "@/generated/graphql.server";
import {
  Button,
  Link,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DatabaseQuery,
  LogPayload,
  useDatabaseQuery,
  useUnlinkDatabaseLogsSubscription,
  useUnlinkDatabaseMutation,
} from "@/generated/graphql";
import toast from "react-hot-toast";
import { DateTime } from "luxon";
import { DatabaseLinkCard } from "@/ui/components/card/DatabaseLinkCard";
import { LinkDatabaseToAppForm } from "@/ui/components/forms/LinkDatabaseToAppForm";
import { Terminal } from "@/ui/components/Terminal";

interface AppProps {
  app: AppByIdQuery["app"];
  databases: DatabaseQuery["databases"]["items"];
}

const AppInfoPage = ({ app, databases }: AppProps) => {
  const linkedDatabases = app.databases ?? [];
  const linkedIds = linkedDatabases.map((db) => db.id);
  const notLinkedDatabases =
    databases.filter((db) => {
      return linkedIds?.indexOf(db.id) === -1;
    }) ?? [];

  return (
    <>
      <div className="flex flex-col md:flex-row gap-16">
        <div className="flex flex-col w-full md:w-2/3">
          <h3 className="mb-8">Información de la aplicación</h3>
          {app && (
            <Table>
              <TableHeader>
                <TableColumn> </TableColumn>
                <TableColumn>VALOR</TableColumn>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>{app.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Identificador</TableCell>
                  <TableCell>{app.id}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Creado el</TableCell>
                  <TableCell>
                    {DateTime.fromISO(app.createdAt).toLocaleString(
                      DateTime.DATETIME_FULL
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
        <div className="flex flex-col w-full md:w-1/3 items-start">
          <h3 className="mb-8">Bases de datos conectadas</h3>
          {databases && databases.length === 0 ? (
            <>
              <div className="mt-4 mb-4">
                <p className="text-gray-400">
                  Actualmente no has creado bases de datos, para hacerlo haz el
                  procesos de creación de bases de datos.
                </p>
              </div>
              <Button
                as={Link}
                href="/dashboard/create-database/"
                color="primary"
              >
                Crear una base de datos
              </Button>
            </>
          ) : (
            <>
              {notLinkedDatabases.length !== 0 ? (
                <LinkDatabaseToAppForm
                  app={app}
                  databases={notLinkedDatabases}
                />
              ) : (
                <>
                  <p>
                    Todas las bases de datos ya están enlazadas con esta
                    aplicación. Si quieres crear más bases de datos inicia el
                    proceso de creación de bases de datos.
                  </p>
                  <div className="mt-4">
                    <Link href="/dashboard/create-database">
                      <Button
                        variant="bordered"
                        color="primary"
                        className="mr-3 text-sm"
                      >
                        Crear base de datos
                      </Button>
                    </Link>
                  </div>
                </>
              )}
              {app && app.databases && (
                <>
                  <h3 className="mt-8 mb-4">
                    {app.databases.length > 0 && "Bases de datos enlazadas"}
                  </h3>
                  <div className="flex flex-col w-full gap-2">
                    {app.databases.map((database, index) => {
                      return (
                        <DatabaseLinkCard
                          key={index}
                          database={database}
                          app={app}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AppInfoPage;