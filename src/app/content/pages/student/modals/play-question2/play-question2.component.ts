// + Algunos listeners se pueden reutlizar poniendo un param 'type' que indique a que se refiere

// Angular
import { Component, OnInit, Input, HostListener } from '@angular/core';
// ng-bootstrap
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
// ngx-toastr
import { ToastrService } from 'ngx-toastr';
// ngx-lightbox
import { Lightbox } from 'ngx-lightbox';
// rxjs
import { Subscription } from 'rxjs';
// Services
import { LessonQuestionService } from 'src/app/core/services/API/lesson-question.service';
import { SessionService } from 'src/app/core/services/API/session.service';

@Component({
   selector: 'cw-play-question2',
   templateUrl: './play-question2.component.html',
   styleUrls: ['./play-question2.component.scss'],
})
export class PlayQuestion2Component implements OnInit {

   // ??
   @HostListener('window:beforeunload', ['$event'])
   beforeUnloadHander(event) {
      this.exitToClassSectionRoomAsStudent();
      // this.exitToParticipantsToPlayQuestionSectionRoomAsStudent(); // ?
   }

   @Input() class;
   subscriptions$: Subscription;

   total_attendes: number = 0;
   data_attendes: Array<any> = [];
   overview;
   current_user: any; // Estudiante actual
   current_question: any; // Pregunta actual que se está jugando // { difficulty... }
   current_participation_status: number; // Estado de participación actual del estudiante
   counter_ended_question: number = 5; // Contador de finalización de pregunta

   constructor(
      public activeModal: NgbActiveModal,
      private toastr: ToastrService,
      private _classQuestionSrv: LessonQuestionService,
      private _sessionSrv: SessionService,
      private _lightbox: Lightbox
   ) { }

   ngOnInit() {
      this.current_user = this._sessionSrv.getUser(); // Obtiene el estudiante actual
      this.subscriptions$ = new Subscription();

      this.enterToClassroomAsStudent(); // Emiter: indica que el estudiante ingreso a la clase

      // Listener: recibe múltiples eventos
      // + type:
      //   [1] actualiza la lista completa de estudiantes en clase (incluyendose)
      //       { type: 1, detail: UPDATE_STUDENT_ATTENDEES, }
      //   [2] actualiza el estado de un estudiante
      //       { type: 2, detail: UPDATE_STUDENT_STATUS, id_user, update_student_status, update_question_status }
      //   [3] actualiza el estado de la pregunta actual
      //       { type: 3, detail: UPDATE_QUESTION_STATUS, question: { id_question, difficulty, description, status } }
      //   [5] indica cuando un estudiante deja la clase
      //       { type: 5, detail: STUDENT_LEFT_CLASS, id_user }
      this.subscriptions$.add(this._classQuestionSrv.listenStudentHasEnteredToClassroom()
         .subscribe((data: any) => {

            console.log("data type: ", data);
            const { type, id_user } = data;

            if (type == 'UPDATE_STUDENT_STATUS') {

               const { student_status, question_status } = data;
               // Busca al estudiante a actualizar entre los asistentes
               let index_student = this.data_attendes
                  .findIndex((student: any) => student.id_user == id_user);
               // Actualiza el estado del estudiante (si lo encuentra)
               if (index_student >= 0) this.data_attendes[index_student]['participation_status'] = student_status;
               // Actualiza el estado de la participación en clase
               this.current_question.status = question_status;
               // Actualiza el estado de participación del estudiante (necesario)
               if (this.current_user.id_user == id_user) {

                  this.current_participation_status = student_status;
                  if (student_status == 3) {
                     this.toastr.success(`Has sido escogido para responder la pregunta.`, 'Escogido para responder!');
                  }

               }

            }
            else if (type == 3) {

               this.current_question = data.question; // Actualiza la pregunta actual
               // Si la pregunta finaliza inicia el contador (status 5)
               if (this.current_question && this.current_question.status == 5) {
                  this.finishCurrestQuestion();
                  this.overview = data.participants_overview;
               }

            }
            else if (type == 5) {

               // Busca al estudiante que salió de la sala entre los asistentes
               let index_student = this.data_attendes
                  .findIndex((student: any) => student.id_user == data.id_user);
               // Elimina al estudiante de entre los asistentes (si lo encuentra)
               if (index_student >= 0) {
                  this.data_attendes.splice(index_student, 1);
                  this.total_attendes--; // Actualiza el número de asistentes
               }


            }
            else {
               // + Cuando un estudiante entra a la sala recibe todos los estudiantes que ya están en la sala (incluyendose)
               this.data_attendes = data;
               this.total_attendes = data.length;

               // Busca al estudiante actual entre los asistentes
               let current_student = this.data_attendes.find(student => student.id_user == this.current_user.id_user);
               // Establece el estado actual del estudiante (si lo encuentra)
               if (current_student) {
                  this.current_participation_status = current_student.participation_status;
                  current_student.middle_name += ' (Yo)';
               }

            }

         },
            (error) => {
               console.log("error: ", error);
               this.toastr.error(`El estado del estudiante ya se ha registrado.`, `Ha ocurrido un error!`);
            })
      );

   }

   // Finaliza la pregunta mediante un counter
   finishCurrestQuestion() {
      let interval = setInterval(() => {
         this.counter_ended_question--;
         if (this.counter_ended_question == 0) {
            clearInterval(interval); // Finaliza el interval
            this.current_question = null; // Elimina la pregunta
            this.current_participation_status = 1;
            this.counter_ended_question = 5; // Reestablece el contador
            // Establece el estado de los estudiantes a 'en espera'
            this.data_attendes.forEach(student => {
               student.participation_status = 1
            });
         }
      }, 1000);

   }

   closeOverview() {
      this.overview = null;
   }

   imageZoom(question) {
      const src = 'http://146.83.109.228:3300/' + question.image;
      const caption = question.description;
      const thumb = question.image;
      const album = { src, caption, thumb }

      const albums = [album];
      this._lightbox.open(albums, 0);
   }

   updateParticipantStatus(status) {

      this._classQuestionSrv.e_UpdateParticipantStatus({
         id_user: this.current_user.id_user,
         id_class: this.class.id_class,
         id_question: this.current_question.id_question,
         status: status,
         user: this.current_user, // Puedo obtener el user en el servidor consultando la db también
         sender: 'STUDENT'
      });

      // Actualiza el estado del participante
      this.current_participation_status = status;
   }


   // Emiter: indica que el estudiante actual ingresó de la sala
   enterToClassroomAsStudent() {
      this._classQuestionSrv.enterToPlayQuestionSectionRoomAsStudent({
         id_class: this.class.id_class,
         user: this.current_user
      });
   }

   // Emiter: indica que el estudiante actual salió de la sala
   exitToClassSectionRoomAsStudent() {
      this._classQuestionSrv.exitToPlayQuestionSectionRoomAsStudent({
         id_class: this.class.id_class,
         id_user: this.current_user.id_user
      });
   }

   ngOnDestroy() {
      this.exitToClassSectionRoomAsStudent(); // Emiter: indica que el estudiante actual salió de la sala
      this.subscriptions$.unsubscribe(); // Cancela todas las subcripciones (listeners)
   }

}
